/**
 * نوشتن دادهٔ کاربر از بیرون صفحهٔ تب جدید (نوار آدرس، منوی راست‌کلیک).
 * همان شکل‌هایی که ویجت‌ها می‌خوانند؛ ویجت‌های باز با onChanged خودشان تازه می‌شوند.
 */

import { normalizeNotes, createNote, MAX_NOTES } from '../lib/notes.js';

const KEYS = { todos: 'yar:todos', notes: 'yar:notes', shortcuts: 'yar:shortcuts' };
const MAX_TODO = 160;
const MAX_SHORTCUTS = 12;

const read = async (key, fallback) => (await chrome.storage.local.get(key))[key] ?? fallback;

/** @returns {Promise<string>} متن ثبت‌شده (کوتاه‌شده) */
export async function addTodo(text) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TODO);
  if (!clean) throw new Error('متن کار خالی است');
  const items = await read(KEYS.todos, []);
  items.push({ id: crypto.randomUUID(), text: clean, done: false, at: Date.now() });
  await chrome.storage.local.set({ [KEYS.todos]: items });
  return clean;
}

/** یادداشت تازه در ابتدای فهرست؛ نشانی منبع (اگر باشد) زیر متن می‌آید. */
export async function addNote(text, sourceUrl = '') {
  const body = String(text ?? '').trim();
  if (!body) throw new Error('متن یادداشت خالی است');
  const state = normalizeNotes(await read(KEYS.notes, null));
  // یادداشت خالیِ پیش‌فرض جایش را به یادداشت تازه می‌دهد، نه اینکه کنارش بماند
  const notes = state.notes.filter((note) => note.text.trim());
  const note = createNote(sourceUrl ? `${body}\n\n— ${sourceUrl}` : body);
  const next = { version: 2, active: note.id, notes: [note, ...notes].slice(0, MAX_NOTES) };
  await chrome.storage.local.set({ [KEYS.notes]: next });
}

/**
 * @returns {Promise<'added'|'exists'|'full'|'invalid'>}
 */
export async function addShortcut(url, title = '') {
  let normalized;
  try {
    normalized = new URL(url);
  } catch {
    return 'invalid';
  }
  if (!/^https?:$/.test(normalized.protocol)) return 'invalid';
  const stored = await read(KEYS.shortcuts, {});
  const custom = Array.isArray(stored.custom) ? stored.custom : [];
  if (custom.some((item) => item.url === normalized.toString())) return 'exists';
  if (custom.length >= MAX_SHORTCUTS) return 'full';
  const label = (title || normalized.hostname.replace(/^www\./, '')).slice(0, 40);
  custom.push({ url: normalized.toString(), title: label });
  await chrome.storage.local.set({ [KEYS.shortcuts]: { ...stored, custom } });
  return 'added';
}
