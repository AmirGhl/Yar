/**
 * توست با امکان «برگرداندن».
 * کارهای برگشت‌پذیر (حذف یک مورد) توست می‌گیرند، نه دیالوگ تأیید؛
 * دیالوگ فقط برای کارهای واقعاً برگشت‌ناپذیر است.
 */

import { el, icon } from '../core/dom.js';

let layer = null;

function ensureLayer() {
  if (!layer) {
    layer = el('div', { class: 'toast-layer', role: 'status', 'aria-live': 'polite' });
    document.body.append(layer);
  }
  return layer;
}

/**
 * @param {string} message
 * @param {{actionLabel?:string, onAction?:Function, duration?:number}} options
 */
export function toast(message, { actionLabel, onAction, duration = 5000 } = {}) {
  const node = el('div', { class: 'toast' }, [icon('check', { size: 16 }), el('span', { text: message })]);

  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    node.classList.add('toast--leaving');
    node.addEventListener('animationend', () => node.remove(), { once: true });
  };

  if (actionLabel && onAction) {
    node.append(
      el('button', {
        class: 'toast__action',
        type: 'button',
        text: actionLabel,
        on: {
          click: () => {
            onAction();
            dismiss();
          },
        },
      }),
    );
  }

  ensureLayer().append(node);
  timer = setTimeout(dismiss, duration);
  return dismiss;
}
