/**
 * دیالوگ کوچک ورودی — جایگزین window.prompt که نه ظاهر افزونه را دارد
 * و نه اجازهٔ اعتبارسنجی زنده می‌دهد.
 */

import { el, icon } from '../core/dom.js';

/**
 * @param {{title:string, fields:Array<{name:string, label:string, placeholder?:string,
 *          value?:string, type?:string, required?:boolean}>,
 *          submitLabel?:string, validate?:(values:object)=>string|null}} options
 * @returns {Promise<object|null>} مقادیر، یا null اگر کاربر منصرف شد
 */
export function promptDialog({ title, fields, submitLabel = 'افزودن', validate }) {
  return new Promise((resolve) => {
    const opener = document.activeElement;
    const scrim = el('div', { class: 'scrim' });
    const error = el('p', { class: 'field__hint', role: 'alert', style: { color: 'var(--down)' } });

    const inputs = fields.map((field) =>
      el('input', {
        class: 'input',
        type: field.type ?? 'text',
        name: field.name,
        value: field.value ?? '',
        placeholder: field.placeholder ?? '',
        'aria-label': field.label,
        autocomplete: 'off',
      }),
    );

    const form = el('form', { class: 'prompt__form' }, [
      ...fields.map((field, index) =>
        el('label', { class: 'field' }, [el('span', { class: 'field__label', text: field.label }), inputs[index]]),
      ),
      error,
      el('div', { class: 'prompt__actions' }, [
        el('button', { class: 'btn btn--primary', type: 'submit', text: submitLabel }),
        el('button', { class: 'btn btn--ghost', type: 'button', text: 'انصراف', on: { click: () => close(null) } }),
      ]),
    ]);

    const dialog = el(
      'div',
      { class: 'card prompt', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      [el('h2', { class: 'prompt__title' }, [icon('plus', { size: 16 }), title]), form],
    );

    function close(result) {
      document.removeEventListener('keydown', onKeydown, true);
      dialog.remove();
      scrim.remove();
      opener?.focus?.();
      resolve(result);
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(null);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = [...dialog.querySelectorAll('input, button')];
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

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = Object.fromEntries(fields.map((field, index) => [field.name, inputs[index].value.trim()]));
      const missing = fields.find((field) => field.required && !values[field.name]);
      if (missing) {
        error.textContent = `${missing.label} را وارد کنید.`;
        inputs[fields.indexOf(missing)].focus();
        return;
      }
      const message = validate?.(values);
      if (message) {
        error.textContent = message;
        inputs[0].focus();
        return;
      }
      close(values);
    });

    scrim.addEventListener('click', () => close(null));
    document.addEventListener('keydown', onKeydown, true);
    document.body.append(scrim, dialog);
    inputs[0]?.focus();
  });
}
