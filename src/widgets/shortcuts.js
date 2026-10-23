/**
 * میان‌برهای سریع: پرکاربردترین سایت‌های مرورگر + میان‌برهای دستی کاربر.
 *
 * شبکه همیشه پر است — خانه‌های خالی خودشان دکمهٔ «افزودن»‌اند.
 * این هم تعداد ردیف‌ها را ثابت نگه می‌دارد (چیدمان بالا و پایین نمی‌پرد)
 * و هم راه افزودن را همان‌جایی می‌گذارد که کاربر نگاه می‌کند.
 *
 * جابه‌جایی: خانه‌ها با کشیدن (یا Alt + جهت روی صفحه‌کلید) مرتب می‌شوند. اولین
 * جابه‌جایی، ردیف فعلی را «سنجاق» می‌کند — پرکاربردهای مرورگر هر روز ترتیبشان
 * عوض می‌شود و ترتیبی که کاربر با دست ساخته نباید فردا به هم بریزد.
 * کشیدن یک پیوند از هر جای دیگر (نوار نشان‌ها، صفحهٔ وب) روی شبکه، میان‌بر می‌سازد.
 */

import { el, icon, faviconUrl } from '../core/dom.js';
import { MESSAGE, send } from '../core/messaging.js';
import { readData, writeData, STORAGE_KEYS } from '../core/storage.js';
import { prefersReducedMotion } from '../core/motion.js';
import { toast } from '../ui/toast.js';
import { promptDialog } from '../ui/prompt.js';
import { siteMark } from '../ui/site-mark.js';
import { moveItem } from '../lib/reorder.js';

const SLOTS = 12;
const DRAG_TYPE = 'application/x-yar-shortcut';

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

function labelFor(url, fallback) {
  if (fallback) return fallback;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function createShortcuts({ settings } = {}) {
  const grid = el('div', { class: 'shortcuts' });
  const element = el('nav', { class: 'shortcuts__wrap', 'aria-label': 'میان‌برها' }, [grid]);
  const reduced = () => prefersReducedMotion(settings?.appearance?.reduceMotion);

  /** @type {Array<{url:string,title:string}>} */
  let custom = [];
  /** @type {Array<{url:string,title:string}>} */
  let top = [];
  /** @type {string[]} نشانی‌هایی که کاربر از فهرست پرکاربرد کنار گذاشته */
  let hidden = [];
  /** @type {Array<{url:string,title:string,pinned:boolean}>} آنچه همین الان روی شبکه است */
  let filled = [];
  let dragIndex = null;

  const persist = () => writeData(STORAGE_KEYS.shortcuts, { custom, hidden });

  // --- جابه‌جایی ---

  /** جای خانه‌ها پیش از تغییر، برای انیمیشن FLIP (از جای قدیم به جای تازه). */
  const snapshot = () =>
    new Map([...grid.querySelectorAll('[data-url]')].map((node) => [node.dataset.url, node.getBoundingClientRect()]));

  function animateFrom(before) {
    if (reduced() || !before) return;
    for (const node of grid.querySelectorAll('[data-url]')) {
      const old = before.get(node.dataset.url);
      if (!old) continue;
      const now = node.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (!dx && !dy) continue;
      node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: 260,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      });
    }
  }

  /** ترتیب فعلی شبکه سنجاق می‌شود و خانهٔ from به جای to می‌رود. */
  async function move(from, to, { focus = false } = {}) {
    if (from === to || from == null || to == null) return;
    const before = snapshot();
    const wasPinned = filled.every((item) => item.pinned);
    custom = moveItem(filled, from, to).map(({ url, title }) => ({ url, title }));
    await persist();
    render();
    animateFrom(before);
    if (focus) grid.querySelector(`[data-url="${CSS.escape(custom[Math.min(to, custom.length - 1)].url)}"] .shortcut__link`)?.focus();
    if (!wasPinned) toast('ترتیب میان‌برها ثابت شد — پرکاربردهای مرورگر دیگر جابه‌جایش نمی‌کنند');
  }

  /** کشیدن یک پیوند از بیرون صفحه روی شبکه. */
  async function addDropped(url, title, index) {
    const normalized = normalizeUrl(url);
    if (!normalized || !/^https?:/i.test(normalized)) return;
    if (filled.some((item) => item.url === normalized)) {
      toast('این سایت از قبل در میان‌برهاست');
      return;
    }
    const before = snapshot();
    const list = filled.map(({ url: u, title: t }) => ({ url: u, title: t }));
    list.splice(Math.min(index, list.length), 0, { url: normalized, title: labelFor(normalized, title) });
    custom = list.slice(0, SLOTS);
    await persist();
    render();
    animateFrom(before);
    toast(`«${labelFor(normalized, title)}» اضافه شد`);
  }

  const clearDropMarks = () =>
    grid.querySelectorAll('.is-drop-target').forEach((node) => node.classList.remove('is-drop-target'));

  /** شیء کشیده‌شده از بیرون: نشانی و عنوان (اگر مرورگر داده باشد). */
  function droppedLink(dataTransfer) {
    const list = dataTransfer.getData('text/uri-list') || dataTransfer.getData('text/plain');
    const url = list
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#'));
    const html = dataTransfer.getData('text/html');
    const title = html ? new DOMParser().parseFromString(html, 'text/html').body.textContent.trim() : '';
    return url ? { url, title: title && title !== url ? title.slice(0, 40) : '' } : null;
  }

  function bindDropTarget(node, index) {
    node.addEventListener('dragover', (event) => {
      const internal = dragIndex != null;
      const external = !internal && [...event.dataTransfer.types].some((type) => type === 'text/uri-list' || type === 'text/plain');
      if (!internal && !external) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = internal ? 'move' : 'copy';
      if (!node.classList.contains('is-drop-target')) {
        clearDropMarks();
        node.classList.add('is-drop-target');
      }
    });
    node.addEventListener('dragleave', (event) => {
      if (!node.contains(event.relatedTarget)) node.classList.remove('is-drop-target');
    });
    node.addEventListener('drop', (event) => {
      event.preventDefault();
      clearDropMarks();
      // خانهٔ خالی یعنی «آخر ردیف»
      const target = Math.min(index, filled.length - (dragIndex != null ? 1 : 0));
      if (dragIndex != null) {
        move(dragIndex, target);
        return;
      }
      const link = droppedLink(event.dataTransfer);
      if (link) addDropped(link.url, link.title, target);
    });
  }

  // --- خانه‌ها ---

  const tile = (item, index, onRemove) => {
    const image = el('img', { src: faviconUrl(item.url), alt: '', loading: 'lazy' });
    image.addEventListener('error', () => image.replaceWith(siteMark(item.title, item.url)));

    const link = el(
      'a',
      {
        class: 'shortcut__link',
        href: item.url,
        title: `${item.url}\nبرای جابه‌جایی بکشید (یا Alt + ← →)`,
        on: {
          keydown: (event) => {
            if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
            event.preventDefault();
            // راست‌چین: چپ یعنی خانهٔ بعدی
            const to = index + (event.key === 'ArrowLeft' ? 1 : -1);
            if (to >= 0 && to < filled.length) move(index, to, { focus: true });
          },
        },
      },
      [el('span', { class: 'shortcut__icon' }, [image]), el('span', { class: 'shortcut__label', text: item.title })],
    );

    const node = el('div', { class: 'shortcut', draggable: true, dataset: { url: item.url } }, [
      link,
      el(
        'button',
        {
          class: 'shortcut__remove',
          type: 'button',
          'aria-label': `حذف ${item.title}`,
          on: {
            click: (event) => {
              event.preventDefault();
              onRemove();
            },
          },
        },
        [icon('close', { size: 11 })],
      ),
    ]);

    node.addEventListener('dragstart', (event) => {
      dragIndex = index;
      event.dataTransfer.effectAllowed = 'copyMove';
      // کشیدن از روی پیوند یا آیکونِ داخل خانه هم شروع می‌شود؛ تصویر کشیدن همیشه کل خانه است
      const box = node.getBoundingClientRect();
      event.dataTransfer.setDragImage(node, box.width / 2, box.height / 2);
      // نشانی واقعی هم همراه است، تا رها کردن روی نوار نشان‌های مرورگر هم کار کند
      event.dataTransfer.setData(DRAG_TYPE, String(index));
      event.dataTransfer.setData('text/uri-list', item.url);
      event.dataTransfer.setData('text/plain', item.url);
      requestAnimationFrame(() => node.classList.add('is-dragging'));
      grid.classList.add('is-sorting');
    });
    node.addEventListener('dragend', () => {
      dragIndex = null;
      node.classList.remove('is-dragging');
      grid.classList.remove('is-sorting');
      clearDropMarks();
    });
    bindDropTarget(node, index);
    return node;
  };

  const emptySlot = (index) => {
    const node = el(
      'button',
      { class: 'shortcut shortcut--empty', type: 'button', 'aria-label': 'افزودن میان‌بر', on: { click: addShortcut } },
      [el('span', { class: 'shortcut__icon' }, [icon('plus', { size: 16 })])],
    );
    bindDropTarget(node, index);
    return node;
  };

  async function addShortcut() {
    const values = await promptDialog({
      title: 'میان‌بر تازه',
      submitLabel: 'افزودن',
      fields: [
        { name: 'url', label: 'نشانی سایت', placeholder: 'example.com', required: true },
        { name: 'title', label: 'نام (اختیاری)', placeholder: 'خودکار از روی دامنه' },
      ],
      validate: (input) => (normalizeUrl(input.url) ? null : 'نشانی معتبر نیست. مثال: example.com'),
    });
    if (!values) return;

    const url = normalizeUrl(values.url);
    const title = values.title || labelFor(url);
    custom.push({ url, title });
    await persist();
    render();
    toast(`«${title}» اضافه شد`);
  }

  const removeCustom = async (index) => {
    const [removed] = custom.splice(index, 1);
    await persist();
    render();
    toast(`«${removed.title}» حذف شد`, {
      actionLabel: 'برگرداندن',
      onAction: async () => {
        custom.splice(index, 0, removed);
        await persist();
        render();
      },
    });
  };

  const hideTop = async (item) => {
    hidden.push(item.url);
    await persist();
    render();
    toast(`«${item.title}» برداشته شد`, {
      actionLabel: 'برگرداندن',
      onAction: async () => {
        hidden = hidden.filter((url) => url !== item.url);
        await persist();
        render();
      },
    });
  };

  function render() {
    const suggested = top
      .filter((item) => !hidden.includes(item.url) && !custom.some((entry) => entry.url === item.url))
      .slice(0, Math.max(0, SLOTS - custom.length));

    filled = [
      ...custom.slice(0, SLOTS).map((item) => ({ ...item, pinned: true })),
      ...suggested.map((item) => ({ ...item, pinned: false })),
    ];

    const tiles = filled.map((item, index) =>
      tile(item, index, () => (item.pinned ? removeCustom(index) : hideTop(item))),
    );
    const blanks = Array.from({ length: Math.max(1, SLOTS - filled.length) }, (_, offset) => emptySlot(filled.length + offset));
    grid.replaceChildren(...tiles, ...blanks);
  }

  (async () => {
    const stored = (await readData(STORAGE_KEYS.shortcuts)) ?? {};
    custom = Array.isArray(stored.custom) ? stored.custom : [];
    hidden = Array.isArray(stored.hidden) ? stored.hidden : [];
    render();
    try {
      const sites = await send(MESSAGE.topSites);
      top = sites.map((site) => ({ url: site.url, title: site.title || labelFor(site.url) }));
    } catch {
      // بدون دسترسی به پرکاربردها فقط میان‌برهای دستی می‌مانند
    }
    render();
  })();

  return { element };
}
