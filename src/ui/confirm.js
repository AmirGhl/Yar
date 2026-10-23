/**
 * دیالوگ تأیید برای کارهای برگشت‌ناپذیر.
 * فوکوس داخل دیالوگ حبس می‌شود و پس از بسته شدن به عنصر آغازگر برمی‌گردد.
 */

import { el } from '../core/dom.js';

/**
 * @param {{title:string, description:string, confirmLabel?:string, cancelLabel?:string, danger?:boolean}} options
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
  title,
  description,
  confirmLabel = 'تأیید',
  cancelLabel = 'انصراف',
  danger = false,
}) {
  return new Promise((resolve) => {
    const opener = document.activeElement;
    const scrim = el('div', { class: 'scrim' });

    const confirmButton = el('button', {
      class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`,
      type: 'button',
      text: confirmLabel,
    });
    const cancelButton = el('button', { class: 'btn btn--ghost', type: 'button', text: cancelLabel });

    const dialog = el(
      'div',
      {
        class: 'card',
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': 'confirm-title',
        'aria-describedby': 'confirm-desc',
        style: {
          position: 'fixed',
          insetInlineStart: '50%',
          insetBlockStart: '50%',
          transform: 'translate(50%, -50%)',
          width: 'min(24rem, calc(100vw - 2rem))',
          zIndex: '70',
          transformOrigin: 'center',
        },
      },
      [
        el('h2', { id: 'confirm-title', text: title, style: { fontSize: '1.05rem', fontWeight: '700' } }),
        el('p', { id: 'confirm-desc', text: description, style: { color: 'var(--text-muted)', fontSize: '0.88rem' } }),
        el('div', { style: { display: 'flex', gap: 'var(--s-2)', justifyContent: 'flex-start' } }, [
          confirmButton,
          cancelButton,
        ]),
      ],
    );

    const close = (result) => {
      document.removeEventListener('keydown', onKeydown, true);
      dialog.remove();
      scrim.remove();
      opener?.focus?.();
      resolve(result);
    };

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = [cancelButton, confirmButton];
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

    confirmButton.addEventListener('click', () => close(true));
    cancelButton.addEventListener('click', () => close(false));
    scrim.addEventListener('click', () => close(false));
    document.addEventListener('keydown', onKeydown, true);

    document.body.append(scrim, dialog);
    // فوکوس اولیه روی گزینهٔ امن، نه گزینهٔ مخرب
    cancelButton.focus();
  });
}
