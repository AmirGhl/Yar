/**
 * پوستهٔ مشترک دیالوگ‌های مودال: پرده، تلهٔ فوکوس، Escape و بازگرداندن فوکوس.
 * محتوا را صدازننده می‌سازد؛ اینجا فقط رفتار «پنجرهٔ روی صفحه» است.
 */

import { el, icon } from '../core/dom.js';
import { iconButton } from './card.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * @param {{title:string, iconName?:string, content:HTMLElement, className?:string,
 *          headless?:boolean, onClose?:()=>void}} options
 *   `headless` سربرگ را حذف می‌کند (پالت فرمان خودش ورودی بالای صفحه دارد).
 * @returns {{close:()=>void, element:HTMLElement}}
 */
export function openDialog({ title, iconName = 'dot', content, className = '', headless = false, onClose }) {
  const opener = document.activeElement;
  const scrim = el('div', { class: 'scrim' });

  const head = headless
    ? null
    : el('header', { class: 'dialog__head' }, [
        el('h2', { class: 'dialog__title' }, [icon(iconName, { size: 17 }), title]),
        el('div', { class: 'dialog__close' }, [iconButton('close', 'بستن', () => close())]),
      ]);

  const element = el(
    'div',
    { class: `card dialog ${className}`.trim(), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    [head, content].filter(Boolean),
  );

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown, true);
    element.remove();
    scrim.remove();
    opener?.focus?.();
    onClose?.();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = [...element.querySelectorAll(FOCUSABLE)].filter((node) => node.offsetParent !== null);
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

  scrim.addEventListener('click', close);
  document.addEventListener('keydown', onKeydown, true);
  document.body.append(scrim, element);
  (element.querySelector('[autofocus]') ?? element.querySelector(FOCUSABLE))?.focus();

  return { close, element };
}
