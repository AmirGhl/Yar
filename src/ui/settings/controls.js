/** اجزای فرم مشترک بخش‌های تنظیمات: گروه، کلید روشن/خاموش، منوی انتخاب. */

import { el } from '../../core/dom.js';

export const group = (title, children) =>
  el('section', { class: 'settings-group', 'data-group': title }, [
    el('h3', { class: 'settings-group__title', text: title }),
    ...children,
  ]);

export function toggle(label, checked, onChange, hint) {
  const input = el('input', { type: 'checkbox', checked, on: { change: (event) => onChange(event.target.checked) } });
  return el('label', { class: 'switch' }, [
    input,
    el('span', { class: 'switch__track' }, [el('span', { class: 'switch__thumb' })]),
    el('span', { class: 'switch__text' }, [label, hint && el('small', { text: hint })]),
  ]);
}

export function selectField(label, options, current, onChange, hint) {
  const select = el(
    'select',
    { class: 'select', on: { change: (event) => onChange(event.target.value) } },
    options.map((option) => el('option', { value: option.value, text: option.label, selected: option.value === current })),
  );
  return el('div', { class: 'field' }, [
    el('label', { class: 'field__label', text: label }),
    select,
    hint && el('span', { class: 'field__hint', text: hint }),
  ]);
}
