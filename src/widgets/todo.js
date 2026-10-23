/** فهرست کارها با ذخیرهٔ خودکار و حذف قابل برگشت. */

import { el, icon } from '../core/dom.js';
import { createCard, iconButton } from '../ui/card.js';
import { emptyState } from '../ui/states.js';
import { readData, writeData, onDataChanged, STORAGE_KEYS } from '../core/storage.js';
import { toast } from '../ui/toast.js';
import { toFaDigits } from '../lib/format.js';

export function createTodo({ settings, setBadge }) {
  const digits = (value) => (settings.appearance.persianDigits ? toFaDigits(value) : String(value));

  /** @type {Array<{id:string, text:string, done:boolean, at:number}>} */
  let items = [];

  const list = el('ul', { class: 'todo__list' });
  const progress = el('span', { class: 'todo__progress' });
  const input = el('input', {
    class: 'input',
    type: 'text',
    placeholder: 'یک کار تازه بنویسید…',
    'aria-label': 'کار تازه',
    maxlength: '160',
  });

  const form = el('form', { class: 'todo__form' }, [
    input,
    el('button', { class: 'btn btn--primary', type: 'submit', 'aria-label': 'افزودن کار' }, [icon('plus', { size: 17 })]),
  ]);

  const clearDone = iconButton('trash', 'پاک کردن کارهای انجام‌شده', async () => {
    const removed = items.filter((item) => item.done);
    if (!removed.length) {
      toast('کار انجام‌شده‌ای نیست');
      return;
    }
    const snapshot = [...items];
    items = items.filter((item) => !item.done);
    await save();
    toast(`${digits(removed.length)} کار پاک شد`, {
      actionLabel: 'برگرداندن',
      onAction: async () => {
        items = snapshot;
        await save();
      },
    });
  });

  const { element, body } = createCard({ title: 'کارها', iconName: 'list', actions: [clearDone] });
  body.append(form, progress, list);

  const save = async () => {
    await writeData(STORAGE_KEYS.todos, items);
    render();
  };

  const remove = async (id) => {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return;
    const [removed] = items.splice(index, 1);
    await save();
    toast('کار حذف شد', {
      actionLabel: 'برگرداندن',
      onAction: async () => {
        items.splice(index, 0, removed);
        await save();
      },
    });
  };

  /** ویرایش درجا: متن جایش را به یک ورودی می‌دهد؛ Enter ذخیره، Escape انصراف. */
  const startEdit = (item, textNode) => {
    if (!textNode) return; // همین الان در حال ویرایش است
    const editor = el('input', {
      class: 'input todo__editor',
      type: 'text',
      value: item.text,
      maxlength: '160',
      'aria-label': 'ویرایش کار',
    });
    let finished = false;
    const finish = async (commit) => {
      if (finished) return;
      finished = true;
      const text = editor.value.trim();
      if (commit && text && text !== item.text) {
        item.text = text;
        await save();
        return;
      }
      render();
    };
    editor.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        finish(false);
      }
    });
    editor.addEventListener('blur', () => finish(true));
    textNode.replaceWith(editor);
    editor.focus();
    editor.select();
  };

  const toggle = async (id) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    item.done = !item.done;
    await save();
  };

  function render() {
    const done = items.filter((item) => item.done).length;
    progress.textContent = items.length ? `${digits(done)} از ${digits(items.length)} انجام شد` : '';
    progress.style.setProperty('--done', items.length ? String(done / items.length) : '0');
    const left = items.length - done;
    setBadge?.('todo', left ? digits(left) : '');

    if (!items.length) {
      list.replaceChildren(
        emptyState({
          iconName: 'list',
          title: 'فهرست خالی است',
          description: 'کارهای امروزتان را اینجا بنویسید تا از یادتان نرود.',
        }),
      );
      return;
    }

    // انجام‌نشده‌ها بالا می‌مانند؛ کار تمام‌شده نباید جلوی کار باقی‌مانده را بگیرد
    const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done) || b.at - a.at);

    list.replaceChildren(
      ...sorted.map((item) =>
        el('li', { class: 'todo__item', 'data-done': String(item.done) }, [
          el(
            'button',
            {
              class: 'todo__check',
              type: 'button',
              role: 'checkbox',
              'aria-checked': String(item.done),
              'aria-label': `${item.done ? 'برگرداندن به انجام‌نشده' : 'انجام شد'}: ${item.text}`,
              on: { click: () => toggle(item.id) },
            },
            [icon('check', { size: 13 })],
          ),
          el('span', {
            class: 'todo__text',
            'data-sensitive': '',
            text: item.text,
            title: 'دوبار کلیک برای ویرایش',
            on: { dblclick: (event) => startEdit(item, event.currentTarget) },
          }),
          el(
            'button',
            {
              class: 'icon-btn todo__tool',
              type: 'button',
              'aria-label': `ویرایش ${item.text}`,
              title: 'ویرایش',
              on: { click: (event) => startEdit(item, event.currentTarget.parentElement.querySelector('.todo__text')) },
            },
            [icon('edit', { size: 13 })],
          ),
          el(
            'button',
            {
              class: 'icon-btn todo__tool',
              type: 'button',
              'aria-label': `حذف ${item.text}`,
              title: 'حذف',
              on: { click: () => remove(item.id) },
            },
            [icon('close', { size: 14 })],
          ),
        ]),
      ),
    );
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    items.push({ id: crypto.randomUUID(), text, done: false, at: Date.now() });
    input.value = '';
    await save();
  });

  const unsubscribe = onDataChanged(STORAGE_KEYS.todos, (next) => {
    items = Array.isArray(next) ? next : [];
    render();
  });

  (async () => {
    items = (await readData(STORAGE_KEYS.todos)) ?? [];
    render();
  })();

  return {
    element,
    /** برای پالت فرمان: افزودن کار بدون باز کردن زبانه */
    add: async (text) => {
      items.push({ id: crypto.randomUUID(), text: text.trim().slice(0, 160), done: false, at: Date.now() });
      await save();
    },
    destroy: unsubscribe,
  };
}
