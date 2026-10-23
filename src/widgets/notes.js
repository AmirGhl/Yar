/**
 * یادداشت‌های آزاد، چندتایی، با ذخیرهٔ خودکار.
 *
 * نوشتهٔ کاربر هرگز نباید گم شود: هم با تأخیر کوتاه ذخیره می‌شود، هم لحظهٔ
 * بسته شدن صفحه، هم پیش از رفتن به یادداشت دیگر. حذف یک یادداشت «برگرداندن» دارد.
 * عنوان هر یادداشت نخستین سطر آن است — چیزی جدا برای نام‌گذاری لازم نیست.
 */

import { el, icon } from '../core/dom.js';
import { createCard, iconButton } from '../ui/card.js';
import { readData, writeData, onDataChanged, STORAGE_KEYS } from '../core/storage.js';
import { toFaDigits, timeAgo } from '../lib/format.js';
import { normalizeNotes, createNote, noteTitle, MAX_NOTES } from '../lib/notes.js';
import { toast } from '../ui/toast.js';

const SAVE_DELAY = 600;

export function createNotes({ settings }) {
  const persianDigits = settings.appearance.persianDigits;
  const digits = (value) => (persianDigits ? toFaDigits(value) : String(value));

  /** @type {ReturnType<typeof normalizeNotes>} */
  let state = normalizeNotes(null);
  let timer = null;
  let dirty = false;

  const textarea = el('textarea', {
    class: 'textarea notes__area',
    placeholder: 'هرچه می‌خواهید بنویسید… خودکار ذخیره می‌شود. سطر اول، عنوان یادداشت است.',
    'aria-label': 'یادداشت',
    spellcheck: false,
    'data-sensitive': '',
  });
  const status = el('p', { class: 'notes__status', 'aria-live': 'polite' });
  const counter = el('span', { class: 'field__hint' });
  const strip = el('div', { class: 'notes__strip', role: 'tablist', 'aria-label': 'یادداشت‌ها' });
  const addButton = el(
    'button',
    { class: 'notes__add', type: 'button', title: 'یادداشت تازه', 'aria-label': 'یادداشت تازه', on: { click: () => addNote() } },
    [icon('plus', { size: 14 })],
  );

  const removeButton = iconButton('trash', 'حذف این یادداشت', () => removeActive());
  const { element, body, actions } = createCard({ title: 'یادداشت', iconName: 'note', actions: [removeButton] });
  actions.prepend(counter);
  body.append(el('div', { class: 'notes__bar' }, [strip, addButton]), textarea, status);

  const activeNote = () => state.notes.find((note) => note.id === state.active) ?? state.notes[0];

  const updateCounter = () => {
    const length = textarea.value.length;
    counter.textContent = length ? `${digits(length)} نویسه` : '';
  };

  async function persist() {
    clearTimeout(timer);
    timer = null;
    if (dirty) {
      const note = activeNote();
      note.text = textarea.value;
      note.at = Date.now();
      dirty = false;
    }
    await writeData(STORAGE_KEYS.notes, state);
    status.textContent = 'ذخیره شد';
    renderStrip();
  }

  function renderStrip() {
    // تازه‌ترین ویرایش‌ها اول؛ ولی یادداشت فعال جایش را عوض نمی‌کند تا زیر دست نپرد
    strip.replaceChildren(
      ...state.notes.map((note) =>
        el('button', {
          class: 'notes__chip',
          type: 'button',
          role: 'tab',
          'aria-selected': String(note.id === state.active),
          title: `${noteTitle(note.text)} — ${timeAgo(note.at, { persianDigits })}`,
          text: noteTitle(note.id === state.active && dirty ? textarea.value : note.text),
          on: { click: () => open(note.id) },
        }),
      ),
    );
    strip.hidden = state.notes.length < 2;
    addButton.disabled = state.notes.length >= MAX_NOTES;
    removeButton.hidden = state.notes.length < 2 && !textarea.value;
  }

  function showActive() {
    const note = activeNote();
    textarea.value = note.text;
    updateCounter();
    status.textContent = note.text ? `آخرین ذخیره ${timeAgo(note.at, { persianDigits })}` : '';
    renderStrip();
    strip.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /** رفتن به یک یادداشت (پالت فرمان هم از همین استفاده می‌کند). */
  async function open(id, { focus = true } = {}) {
    if (dirty) await persist();
    if (!state.notes.some((note) => note.id === id)) return;
    state.active = id;
    showActive();
    await writeData(STORAGE_KEYS.notes, state);
    if (focus) textarea.focus();
  }

  async function addNote() {
    if (state.notes.length >= MAX_NOTES) {
      toast(`حداکثر ${digits(MAX_NOTES)} یادداشت`);
      return;
    }
    if (dirty) await persist();
    const note = createNote();
    state.notes.unshift(note);
    state.active = note.id;
    showActive();
    await writeData(STORAGE_KEYS.notes, state);
    textarea.focus();
  }

  async function removeActive() {
    if (dirty) await persist();
    const index = state.notes.findIndex((note) => note.id === state.active);
    const [removed] = state.notes.splice(index, 1);
    // آخرین یادداشت که برود، یک یادداشت خالی جایش می‌نشیند تا ویجت هیچ‌وقت بی‌یادداشت نماند
    const placeholder = state.notes.length ? null : createNote();
    if (placeholder) state.notes.push(placeholder);
    state.active = state.notes[Math.min(index, state.notes.length - 1)].id;
    showActive();
    await writeData(STORAGE_KEYS.notes, state);
    if (!removed.text.trim()) return; // یادداشت خالی برگرداندن نمی‌خواهد
    toast(`«${noteTitle(removed.text)}» حذف شد`, {
      actionLabel: 'برگرداندن',
      onAction: async () => {
        if (dirty) await persist();
        // یادداشت خالیِ جانشین، اگر دست‌نخورده مانده، جایش را پس می‌دهد
        if (placeholder) state.notes = state.notes.filter((note) => note.id !== placeholder.id || note.text);
        state.notes.splice(Math.min(index, state.notes.length), 0, removed);
        state.active = removed.id;
        showActive();
        await writeData(STORAGE_KEYS.notes, state);
      },
    });
  }

  textarea.addEventListener('input', () => {
    dirty = true;
    updateCounter();
    status.textContent = 'در حال ذخیره…';
    clearTimeout(timer);
    timer = setTimeout(persist, SAVE_DELAY);
    // عنوان روی برگه هم‌زمان با تایپ سطر اول عوض می‌شود
    const chip = strip.querySelector('[aria-selected="true"]');
    if (chip) chip.textContent = noteTitle(textarea.value);
  });

  // اگر کاربر تب را ببندد، آخرین تغییر نباید از دست برود
  const onHide = () => {
    if (dirty) persist();
  };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') onHide();
  };
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', onVisibility);

  // تغییر از تب دیگر: یادداشت در حال تایپِ همین تب هرگز زیر دست کاربر عوض نمی‌شود
  const unsubscribe = onDataChanged(STORAGE_KEYS.notes, (next) => {
    const incoming = normalizeNotes(next);
    const typingHere = dirty || document.activeElement === textarea;
    if (typingHere) {
      const mine = activeNote();
      incoming.notes = incoming.notes.map((note) => (note.id === mine.id ? mine : note));
      if (!incoming.notes.some((note) => note.id === mine.id)) incoming.notes.unshift(mine);
      incoming.active = mine.id;
      state = incoming;
      renderStrip();
      return;
    }
    state = { ...incoming, active: incoming.notes.some((note) => note.id === state.active) ? state.active : incoming.active };
    showActive();
  });

  (async () => {
    const raw = await readData(STORAGE_KEYS.notes);
    state = normalizeNotes(raw);
    // مهاجرت از قالب تک‌یادداشتی، یک‌بار و بی‌صدا
    if (raw && raw.version !== 2) await writeData(STORAGE_KEYS.notes, state);
    showActive();
  })();

  return {
    element,
    open,
    /** برای پالت فرمان: فهرست یادداشت‌ها با عنوان و متن */
    list: () => state.notes.map((note) => ({ id: note.id, title: noteTitle(note.text), text: note.text, at: note.at })),
    destroy() {
      onHide();
      unsubscribe();
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
