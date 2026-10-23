/**
 * کشوی تنظیمات.
 * هر تغییر بی‌درنگ ذخیره و اعمال می‌شود — دکمهٔ «ذخیره» وجود ندارد تا چیزی گم نشود.
 *
 * این فایل فقط پوسته است (باز و بسته شدن، تلهٔ فوکوس، رفتن به یک گروه)؛ محتوای
 * هر گروه در ui/settings/sections/ است و از راه همان زمینهٔ مشترک کار می‌کند.
 */

import { el, icon } from '../../core/dom.js';
import { updateSettings } from '../../core/storage.js';
import { iconButton } from '../card.js';
import { matchScore } from '../../lib/text.js';
import { appearanceSection } from './sections/appearance.js';
import { generalSection } from './sections/general.js';
import { searchSection } from './sections/search.js';
import { timerSection } from './sections/timer.js';
import { backupSection } from './sections/backup.js';
import { citySection } from './sections/city.js';
import { marketSection } from './sections/market.js';
import { newsSection } from './sections/news.js';
import { widgetSection } from './sections/widgets.js';
import { dangerSection } from './sections/danger.js';
import { updatesSection } from './sections/updates.js';

/**
 * @typedef {{settings:object, patch:(delta:object, options?:{rebuildAfter?:boolean})=>Promise<void>,
 *            render:()=>void, apply:(settings:object)=>void, rebuild:()=>void}} SectionContext
 */

/**
 * @param {{settings:object, apply:(settings:object)=>void, rebuild:()=>void}} context
 */
export function createSettingsDrawer({ settings, apply, rebuild }) {
  let scrim = null;
  let drawer = null;
  let opener = null;

  const patch = async (delta, { rebuildAfter = false } = {}) => {
    const next = await updateSettings(delta);
    Object.assign(settings, next);
    apply(next);
    if (rebuildAfter) rebuild();
  };

  let body = null;

  /** بخش‌ها همه یک زمینه می‌گیرند؛ هر کدام فقط آنچه لازم دارد برمی‌دارد. */
  const context = () => ({ settings, patch, render, apply, rebuild });

  function render() {
    if (!body) return;
    const ctx = context();
    body.replaceChildren(
      appearanceSection(ctx),
      generalSection(ctx),
      searchSection(ctx),
      citySection(ctx),
      marketSection(ctx),
      newsSection(ctx),
      timerSection(ctx),
      widgetSection(ctx),
      backupSection(ctx),
      updatesSection(ctx),
      dangerSection(ctx),
    );
    if (query) filterSettings();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab' || !drawer) return;
    const focusables = [...drawer.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
      (node) => !node.disabled && node.offsetParent !== null,
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function close() {
    if (!drawer) return;
    document.removeEventListener('keydown', onKeydown, true);
    drawer.remove();
    scrim.remove();
    drawer = null;
    scrim = null;
    query = '';
    opener?.focus?.();
  }

  /**
   * @param {string} [focusGroup] نام گروهی که باید در دید باشد
   */
  function open(focusGroup) {
    if (drawer) {
      scrollToGroup(focusGroup);
      return;
    }
    opener = document.activeElement;

    body = el('div', { class: 'drawer__body' });
    const closeButton = iconButton('close', 'بستن تنظیمات', close);
    const search = el('input', {
      class: 'input drawer__search',
      type: 'search',
      placeholder: 'جست‌وجو در تنظیمات… (مثلاً «تم» یا «اعلان»)',
      'aria-label': 'جست‌وجو در تنظیمات',
      autocomplete: 'off',
      on: { input: (event) => filterSettings(event.target.value) },
    });

    drawer = el('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'تنظیمات' }, [
      el('header', { class: 'drawer__head' }, [
        icon('settings', { size: 19 }),
        el('h2', { class: 'drawer__title', text: 'تنظیمات' }),
        el('div', { style: { marginInlineStart: 'auto' } }, [closeButton]),
      ]),
      el('div', { class: 'drawer__searchbar' }, [search]),
      body,
    ]);

    scrim = el('div', { class: 'scrim', on: { click: close } });
    document.body.append(scrim, drawer);
    render();
    document.addEventListener('keydown', onKeydown, true);
    closeButton.focus();
    scrollToGroup(focusGroup);
  }

  /**
   * فیلتر زندهٔ تنظیمات: گروهی که عنوانش بخورد کامل می‌ماند؛ وگرنه فقط ردیف‌هایی
   * از آن که متنشان (برچسب و راهنما) بخورد. بعد از هر رندر دوباره اعمال می‌شود.
   */
  let query = '';
  function filterSettings(next = query) {
    query = next.trim();
    if (!body) return;
    let shown = 0;
    for (const section of body.querySelectorAll('.settings-group')) {
      const titleHit = !query || matchScore(query, section.dataset.group) > 0;
      let rowsHit = 0;
      for (const row of section.querySelectorAll(':scope > .switch, :scope > .field, :scope > .settings-row, :scope > p, :scope > button, :scope > input, :scope > div')) {
        const hit = titleHit || matchScore(query, row.textContent + ' ' + (row.querySelector('input, select')?.placeholder ?? '')) > 0;
        row.hidden = !hit;
        if (hit) rowsHit += 1;
      }
      section.hidden = !titleHit && !rowsHit;
      if (!section.hidden) shown += 1;
    }
    body.querySelector('.drawer__empty')?.remove();
    if (!shown) body.append(el('p', { class: 'drawer__empty', text: `تنظیمی با «${query}» پیدا نشد.` }));
  }

  function scrollToGroup(name) {
    const map = {
      weather: 'شهر و آب‌وهوا',
      market: 'بازار',
      news: 'اخبار',
      widgets: 'ویجت‌ها',
      appearance: 'ظاهر',
      general: 'عمومی',
      search: 'جست‌وجو',
      timer: 'تایمر تمرکز',
      backup: 'پشتیبان‌گیری',
      updates: 'به‌روزرسانی',
    };
    const title = map[name];
    if (!title || !body) return;
    if (query) {
      query = '';
      drawer.querySelector('.drawer__search').value = '';
      filterSettings('');
    }
    body.querySelector(`[data-group="${title}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return { open, close };
}
