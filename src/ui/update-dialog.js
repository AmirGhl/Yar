/**
 * پنجرهٔ نسخهٔ تازه: چه چیزی عوض شده، دریافت، و راه نصب.
 *
 * افزونه نمی‌تواند فایل‌های خودش را بازنویسی کند؛ پس برای نصب «باز» (Load unpacked)
 * سه قدم ساده نشان داده می‌شود و دکمهٔ «بارگذاری دوباره» قدم آخر را یک کلیک می‌کند.
 * نصب از فروشگاه کروم خودش به‌روز می‌شود و فقط همین را می‌گوییم.
 */

import { el, icon } from '../core/dom.js';
import { readData, writeData } from '../core/storage.js';
import { openDialog } from './dialog.js';
import { toast } from './toast.js';
import { parseReleaseNotes } from '../lib/versions.js';
import { toFaDigits, timeAgo } from '../lib/format.js';

const UPDATE_KEY = 'yar:update';

/** نصب از فروشگاه کروم نشانی به‌روزرسانی دارد؛ نصب باز ندارد. */
export const installedFromStore = () => Boolean(chrome.runtime.getManifest?.().update_url);

/** متن تغییرات به‌صورت عناصر امن (بدون HTML). */
export function renderNotes(markdown) {
  const lines = parseReleaseNotes(markdown);
  if (!lines.length) return el('p', { class: 'field__hint', text: 'برای این نسخه یادداشت تغییراتی نوشته نشده است.' });
  const out = el('div', { class: 'update__notes' });
  let list = null;
  for (const line of lines) {
    if (line.kind === 'item') {
      list ??= out.appendChild(el('ul'));
      list.append(el('li', { text: line.text }));
      continue;
    }
    list = null;
    out.append(el(line.kind === 'heading' ? 'h4' : 'p', { text: line.text }));
  }
  return out;
}

async function patchState(delta) {
  const state = (await readData(UPDATE_KEY, {})) ?? {};
  await writeData(UPDATE_KEY, { ...state, ...delta });
}

/**
 * @param {{state:object, settings:object}} options state = محتوای yar:update
 */
export function openUpdateDialog({ state, settings }) {
  const persianDigits = settings.appearance.persianDigits;
  const digits = (value) => (persianDigits ? toFaDigits(value) : String(value));
  const { latest, current } = state;

  let dialog = null;
  const actions = el('div', { class: 'update__actions' }, [
    latest.downloadUrl &&
      el('a', { class: 'btn btn--primary', href: latest.downloadUrl, target: '_blank', rel: 'noopener noreferrer' }, [
        icon('download', { size: 16 }),
        'دریافت نسخهٔ تازه',
      ]),
    el('a', { class: 'btn btn--ghost', href: latest.url, target: '_blank', rel: 'noopener noreferrer' }, [icon('external', { size: 15 }), 'صفحهٔ انتشار']),
  ]);

  const steps = installedFromStore()
    ? el('p', { class: 'update__store', text: 'یار از فروشگاه کروم نصب شده است؛ کروم خودش در چند ساعت آینده به‌روزش می‌کند.' })
    : el('ol', { class: 'update__steps' }, [
        el('li', { text: 'فایل zip را دریافت و باز کنید.' }),
        el('li', { text: 'محتوایش را روی همان پوشه‌ای بریزید که یار را از آن «Load unpacked» کرده‌اید (جایگزین فایل‌های قبلی).' }),
        el('li', {}, [
          'دکمهٔ زیر را بزنید (یا در chrome://extensions روی ⟳ یار). داده‌ها و تنظیمات شما دست‌نخورده می‌مانند.',
        ]),
      ]);

  const reload = installedFromStore()
    ? null
    : el('button', {
        class: 'btn',
        type: 'button',
        on: { click: () => chrome.runtime.reload() },
      }, [icon('refresh', { size: 15 }), 'فایل‌ها را جایگزین کردم — بارگذاری دوباره']);

  const later = el('div', { class: 'update__later' }, [
    el('button', {
      class: 'btn btn--ghost',
      type: 'button',
      text: 'یادم بینداز (فردا)',
      on: {
        click: async () => {
          await patchState({ snoozedUntil: Date.now() + 24 * 60 * 60 * 1000 });
          dialog.close();
          toast('فردا دوباره یادآوری می‌کنیم');
        },
      },
    }),
    el('button', {
      class: 'btn btn--ghost',
      type: 'button',
      text: 'این نسخه را نادیده بگیر',
      on: {
        click: async () => {
          await patchState({ dismissedVersion: latest.version });
          dialog.close();
          toast('تا نسخهٔ بعدی چیزی نمی‌گوییم — از تنظیمات همیشه در دسترس است');
        },
      },
    }),
  ]);

  const content = el('div', { class: 'update' }, [
    el('div', { class: 'update__versions' }, [
      el('span', { class: 'update__from tnum', text: digits(current) }),
      icon('chevronLeft', { size: 16 }),
      el('b', { class: 'update__to tnum', text: digits(latest.version) }),
      latest.publishedAt && el('span', { class: 'field__hint', text: `منتشرشده ${timeAgo(latest.publishedAt, { persianDigits })}` }),
    ]),
    el('div', { class: 'update__section' }, [el('h3', { class: 'symbol__title', text: 'تازه‌ها' }), renderNotes(latest.notes)]),
    actions,
    el('div', { class: 'update__section' }, [el('h3', { class: 'symbol__title', text: 'نصب' }), steps, reload]),
    later,
  ]);

  dialog = openDialog({ title: `نسخهٔ تازهٔ یار: ${digits(latest.version)}`, iconName: 'sparkle', content, className: 'dialog--update' });
  return dialog;
}

/**
 * «یار به‌روز شد» — بعد از نصب نسخهٔ تازه، یک بار.
 * @param {{to:string, from:string}} updated
 * @param {object|null} state yar:update — اگر متن تغییرات همین نسخه را داشته باشد نشانش می‌دهیم
 */
export function openWhatsNew({ updated, state, settings }) {
  const persianDigits = settings.appearance.persianDigits;
  const digits = (value) => (persianDigits ? toFaDigits(value) : String(value));
  const notes = state?.latest?.version === updated.to ? state.latest.notes : '';
  const content = el('div', { class: 'update' }, [
    el('div', { class: 'update__versions' }, [
      el('span', { class: 'update__from tnum', text: digits(updated.from) }),
      icon('chevronLeft', { size: 16 }),
      el('b', { class: 'update__to tnum', text: digits(updated.to) }),
    ]),
    renderNotes(notes),
    state?.latest?.url && el('a', { class: 'btn btn--ghost', href: state.latest.url, target: '_blank', rel: 'noopener noreferrer' }, [icon('external', { size: 15 }), 'همهٔ تغییرات در گیت‌هاب']),
  ]);
  return openDialog({ title: 'تازه‌های این نسخه', iconName: 'sparkle', content, className: 'dialog--update' });
}
