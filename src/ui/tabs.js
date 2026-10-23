/**
 * قاب زبانه‌دار: چند ویجت را در یک فضای ثابت جا می‌دهد تا صفحه از یک نما بیرون نزند.
 *
 * هر پنل یک‌بار ساخته می‌شود و بعد فقط پنهان/آشکار می‌شود، پس حالت هر ویجت
 * (متن نیمه‌نوشتهٔ یادداشت، تایمر در حال شمارش) با جابه‌جایی زبانه از بین نمی‌رود.
 *
 * زبانه می‌تواند به‌جای `element` یک `load` بدهد: آن ویجت تا اولین باری که دیده
 * شود ساخته نمی‌شود — اخبار، نشان‌ها و نرخ‌های مبدل و سبد بی‌دلیل در پس‌زمینه گرفته نمی‌شوند.
 */

import { el, icon } from '../core/dom.js';
import { createSpring } from '../core/motion.js';

/**
 * @param {{tabs:Array<{id:string, label:string, icon:string, element:HTMLElement}>,
 *          active?:string, reduced?:boolean, onChange?:(id:string)=>void}} options
 */
export function createTabPanel({ tabs, active, reduced = false, onChange }) {
  const indicator = el('span', { class: 'tabs__indicator', 'aria-hidden': 'true' });
  const tablist = el('div', { class: 'tabs__list', role: 'tablist' });
  const panels = el('div', { class: 'tabs__panels' });

  let current = tabs.some((tab) => tab.id === active) ? active : tabs[0]?.id;

  // فنر روی جای نشانگر: وقتی وسط حرکت زبانهٔ دیگری انتخاب شود،
  // حرکت از همان‌جایی که هست ادامه پیدا می‌کند و پرش ندارد.
  const slide = createSpring({
    damping: 1,
    response: 0.34,
    onUpdate: (value) => {
      indicator.style.transform = `translateX(${value}px)`;
    },
  });

  const buttons = new Map();
  const contents = new Map();

  const placeIndicator = ({ animate = true } = {}) => {
    const button = buttons.get(current);
    if (!button) return;
    const listBox = tablist.getBoundingClientRect();
    const box = button.getBoundingClientRect();
    if (!box.width) return;
    indicator.style.width = `${box.width}px`;
    // در راست‌چین مبدأ سمت راست است، پس فاصله را از لبهٔ راست می‌گیریم.
    const offset = -(listBox.right - box.right);
    if (animate && !reduced) slide.set(offset);
    else slide.jump(offset);
  };

  /** ساختن تنبل: محتوای زبانه فقط بار اول که دیده می‌شود ساخته می‌شود. */
  const ensureLoaded = (id) => {
    const tab = tabs.find((entry) => entry.id === id);
    const panel = contents.get(id);
    if (!tab || !panel || panel.firstChild || !tab.load) return;
    panel.append(tab.load());
  };

  const select = (id, { animate = true, focus = false } = {}) => {
    if (!buttons.has(id)) return;
    ensureLoaded(id);
    current = id;
    for (const [key, button] of buttons) {
      const isActive = key === id;
      button.setAttribute('aria-selected', String(isActive));
      button.tabIndex = isActive ? 0 : -1;
      contents.get(key).hidden = !isActive;
    }
    placeIndicator({ animate });
    if (focus) buttons.get(id).focus();
    onChange?.(id);
  };

  tabs.forEach((tab) => {
    const button = el(
      'button',
      {
        class: 'tabs__tab',
        type: 'button',
        role: 'tab',
        id: `tab-${tab.id}`,
        'aria-controls': `panel-${tab.id}`,
        'aria-selected': String(tab.id === current),
        'aria-label': tab.label,
        title: tab.label,
        tabIndex: tab.id === current ? 0 : -1,
        on: { click: () => select(tab.id) },
      },
      [icon(tab.icon, { size: 16 }), el('span', { class: 'tabs__label', text: tab.label }), el('i', { class: 'tabs__badge', 'aria-hidden': 'true' })],
    );

    const panel = el(
      'div',
      {
        class: 'tabs__panel',
        role: 'tabpanel',
        id: `panel-${tab.id}`,
        'aria-labelledby': `tab-${tab.id}`,
        hidden: tab.id !== current,
      },
      tab.element ? [tab.element] : [],
    );

    buttons.set(tab.id, button);
    contents.set(tab.id, panel);
    tablist.append(button);
    panels.append(panel);
  });

  // پیمایش زبانه‌ها با کلید جهت‌دار، همان‌طور که کاربر از هر رابط زبانه‌داری انتظار دارد
  tablist.addEventListener('keydown', (event) => {
    const ids = tabs.map((tab) => tab.id);
    const index = ids.indexOf(current);
    let next = null;
    // در راست‌چین، کلید چپ به زبانهٔ بعدی می‌رود
    if (event.key === 'ArrowLeft') next = ids[(index + 1) % ids.length];
    else if (event.key === 'ArrowRight') next = ids[(index - 1 + ids.length) % ids.length];
    else if (event.key === 'Home') next = ids[0];
    else if (event.key === 'End') next = ids.at(-1);
    if (!next) return;
    event.preventDefault();
    select(next, { focus: true });
  });

  const element = el('div', { class: 'tabs' }, [el('div', { class: 'tabs__bar' }, [tablist, indicator]), panels]);

  const observer = new ResizeObserver(() => placeIndicator({ animate: false }));
  observer.observe(tablist);

  ensureLoaded(current);

  return {
    element,
    select,
    ensureLoaded,
    /**
     * جایگذاری نشانگر پس از افزوده شدن به صفحه.
     * تا وقتی عنصر داخل سند نباشد اندازه‌اش صفر است، و ResizeObserver هم در تبی که
     * هنوز رندر نشده اجرا نمی‌شود؛ پس یک‌بار دستی و بدون انیمیشن تنظیمش می‌کنیم.
     */
    refresh() {
      placeIndicator({ animate: false });
    },
    /** عدد کوچک روی زبانه (مثلاً کارهای باقی‌مانده)؛ متن خالی یعنی پنهان. */
    setBadge(id, text) {
      const button = buttons.get(id);
      if (!button) return;
      const badge = button.querySelector('.tabs__badge');
      badge.textContent = text;
      const tab = tabs.find((entry) => entry.id === id);
      button.setAttribute('aria-label', text ? `${tab.label} (${text})` : tab.label);
    },
    get active() {
      return current;
    },
    destroy() {
      observer.disconnect();
      slide.stop();
    },
  };
}
