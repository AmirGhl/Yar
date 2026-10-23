/** پوستهٔ مشترک کارت ویجت‌ها: سربرگ، دکمه‌های عمل و بدنه. */

import { el, icon } from '../core/dom.js';

/**
 * @param {{title:string, iconName?:string, grow?:boolean, bare?:boolean,
 *          actions?:HTMLElement[]}} options
 *   `grow` کارت را کش می‌آورد تا فضای خالی ستون را پر کند و بدنه‌اش خودش اسکرول بخورد.
 *   `bare` سربرگ را حذف می‌کند (وقتی کارت داخل قاب زبانه‌دار می‌نشیند و عنوان تکراری است).
 * @returns {{element:HTMLElement, body:HTMLElement, actions:HTMLElement}}
 */
export function createCard({ title, iconName = 'dot', grow = false, bare = false, actions = [] }) {
  const actionsSlot = el('div', { class: 'card__actions' }, actions);
  const body = el('div', { class: 'card__body' });
  const titleId = `card-${Math.random().toString(36).slice(2, 8)}`;

  const head = bare
    ? null
    : el('header', { class: 'card__head' }, [
        el('h2', { class: 'card__title', id: titleId }, [icon(iconName, { size: 16 }), title]),
        actionsSlot,
      ]);

  const element = el(
    'section',
    {
      class: `card widget${grow ? ' card--grow' : ''}${bare ? ' card--bare' : ''}`,
      'aria-label': bare ? title : null,
      'aria-labelledby': bare ? null : titleId,
    },
    [head, body].filter(Boolean),
  );

  return { element, body, actions: actionsSlot };
}

/** دکمهٔ آیکونی با برچسب دسترس‌پذیر — آیکون تنها هرگز بدون نام نمی‌ماند. */
export function iconButton(name, label, onClick, { pressed = null } = {}) {
  const button = el(
    'button',
    {
      class: 'icon-btn',
      type: 'button',
      title: label,
      'aria-label': label,
      on: { click: onClick },
    },
    [icon(name, { size: 17 })],
  );
  if (pressed != null) button.setAttribute('aria-pressed', String(pressed));
  return button;
}
