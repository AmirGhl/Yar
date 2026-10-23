/**
 * شکل داده‌ای یادداشت‌ها و مهاجرت از نسخهٔ تک‌یادداشتی.
 *
 * نسخهٔ قدیم: { text, at }
 * نسخهٔ تازه: { version: 2, active, notes: [{ id, text, at }] }
 * هیچ نوشته‌ای در مهاجرت گم نمی‌شود: یادداشت قدیمی اولین یادداشت فهرست تازه است.
 */

export const MAX_NOTES = 30;
const TITLE_LENGTH = 26;

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `n-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function createNote(text = '') {
  return { id: newId(), text, at: Date.now() };
}

/**
 * هر چیزی که در storage باشد (قدیمی، تازه، خراب یا خالی) → شکل معتبر تازه.
 * @returns {{version:2, active:string, notes:Array<{id:string, text:string, at:number}>}}
 */
export function normalizeNotes(raw) {
  let notes = [];
  if (raw && Array.isArray(raw.notes)) {
    notes = raw.notes
      .filter((note) => note && typeof note.text === 'string')
      .map((note) => ({ id: String(note.id || newId()), text: note.text, at: Number(note.at) || Date.now() }));
  } else if (raw && typeof raw.text === 'string') {
    notes = [{ id: newId(), text: raw.text, at: Number(raw.at) || Date.now() }];
  }
  if (!notes.length) notes = [createNote()];
  notes = notes.slice(0, MAX_NOTES);
  const active = notes.some((note) => note.id === raw?.active) ? raw.active : notes[0].id;
  return { version: 2, active, notes };
}

/** عنوان یادداشت: نخستین سطر غیرخالی، کوتاه‌شده. */
export function noteTitle(text) {
  const line = String(text ?? '')
    .split('\n')
    .map((part) => part.replace(/^[#\-*\s]+/, '').trim())
    .find(Boolean);
  if (!line) return 'یادداشت تازه';
  return line.length > TITLE_LENGTH ? `${line.slice(0, TITLE_LENGTH).trim()}…` : line;
}
