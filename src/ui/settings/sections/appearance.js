/** بخش تنظیمات — ظاهر: تم، پس‌زمینه، رنگ، شیشه، حالت پنهان، ارقام، حرکت. */

import { el, icon } from '../../../core/dom.js';
import { group, toggle, selectField } from '../controls.js';
import { WALLPAPERS } from '../../../core/defaults.js';
import { toast } from '../../toast.js';
import { requestPermissions } from '../../../core/permissions.js';
import { DAILY_WALLPAPER_ID } from '../../../core/theme.js';
import { BING_ORIGIN_PATTERN } from '../../../services/bing.js';

const ACCENTS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#f472b6', '#60a5fa'];
const MAX_WALLPAPER_BYTES = 4 * 1024 * 1024;

/**
 * @param {import('../drawer.js').SectionContext} context
 * @returns {HTMLElement}
 */
export function appearanceSection({ settings, patch, render }) {
  /** خانهٔ «تصویر روز بینگ»: مجوز دامنه دقیقاً با همین کلیک خواسته می‌شود. */
  const dailySwatch = () =>
    el('button', {
      class: 'swatch swatch--daily',
      type: 'button',
      title: 'تصویر روز بینگ',
      'aria-label': 'پس‌زمینه: تصویر روز بینگ',
      'aria-pressed': String(settings.appearance.wallpaper === DAILY_WALLPAPER_ID && !settings.appearance.customWallpaper),
      on: {
        click: async (event) => {
          const button = event.currentTarget;
          if (!(await requestPermissions({ origins: [BING_ORIGIN_PATTERN] }))) {
            toast('بدون اجازهٔ دسترسی به bing.com، تصویر روز گرفته نمی‌شود.');
            return;
          }
          await patch({ appearance: { wallpaper: DAILY_WALLPAPER_ID, customWallpaper: null } });
          [...button.parentElement.children].forEach((node) => node.setAttribute('aria-pressed', 'false'));
          button.setAttribute('aria-pressed', 'true');
          toast('تصویر روز بینگ فعال شد');
        },
      },
    }, [icon('image', { size: 18 })]);

  // ---------- ظاهر ----------
  const build = () =>
    group('ظاهر', [
      selectField(
        'تم',
        [
          { value: 'dark', label: 'تیره' },
          { value: 'light', label: 'روشن' },
          { value: 'auto', label: 'هماهنگ با سیستم' },
        ],
        settings.appearance.theme,
        (value) => patch({ appearance: { theme: value } }),
      ),
      el('div', { class: 'field' }, [
        el('span', { class: 'field__label', text: 'پس‌زمینه' }),
        el(
          'div',
          { class: 'swatches' },
          [...WALLPAPERS.map((wallpaper) =>
            el('button', {
              class: 'swatch',
              type: 'button',
              title: wallpaper.label,
              'aria-label': `پس‌زمینهٔ ${wallpaper.label}`,
              'aria-pressed': String(settings.appearance.wallpaper === wallpaper.id && !settings.appearance.customWallpaper),
              style: { background: wallpaper.css },
              on: {
                click: async (event) => {
                  await patch({ appearance: { wallpaper: wallpaper.id, customWallpaper: null } });
                  [...event.target.parentElement.children].forEach((node) => node.setAttribute('aria-pressed', 'false'));
                  event.target.setAttribute('aria-pressed', 'true');
                },
              },
            }),
          ), dailySwatch()],
        ),
        el('span', { class: 'field__hint', text: 'آخرین خانه: تصویر روز بینگ — هر روز یک عکس تازه، با اجازهٔ دسترسی به bing.com.' }),
      ]),
      el('div', { class: 'field' }, [
        el('label', { class: 'field__label', for: 'wallpaper-file', text: 'تصویر دلخواه' }),
        el('input', {
          class: 'input',
          id: 'wallpaper-file',
          type: 'file',
          accept: 'image/*',
          on: {
            change: async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > MAX_WALLPAPER_BYTES) {
                toast('تصویر بزرگ‌تر از ۴ مگابایت است. تصویر کوچک‌تری انتخاب کنید.');
                event.target.value = '';
                return;
              }
              const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(file);
              });
              await patch({ appearance: { customWallpaper: dataUrl } });
              toast('پس‌زمینه تغییر کرد');
            },
          },
        }),
        settings.appearance.customWallpaper &&
          el('button', {
            class: 'btn btn--ghost',
            type: 'button',
            text: 'حذف تصویر دلخواه',
            on: {
              click: async () => {
                await patch({ appearance: { customWallpaper: null } });
                render();
              },
            },
          }),
      ]),
      el('div', { class: 'field' }, [
        el('label', { class: 'field__label', for: 'dim', text: 'تیرگی پس‌زمینه' }),
        el('input', {
          id: 'dim',
          type: 'range',
          min: '0',
          max: '0.85',
          step: '0.05',
          value: String(settings.appearance.wallpaperDim),
          on: { input: (event) => patch({ appearance: { wallpaperDim: Number(event.target.value) } }) },
        }),
      ]),
      el('div', { class: 'field' }, [
        el('span', { class: 'field__label', text: 'رنگ لهجه' }),
        el(
          'div',
          { class: 'swatches' },
          ACCENTS.map((color) =>
            el('button', {
              class: 'accent-dot',
              type: 'button',
              'aria-label': `رنگ ${color}`,
              'aria-pressed': String(settings.appearance.accent === color),
              style: { background: color },
              on: {
                click: async (event) => {
                  await patch({ appearance: { accent: color } });
                  [...event.target.parentElement.children].forEach((node) => node.setAttribute('aria-pressed', 'false'));
                  event.target.setAttribute('aria-pressed', 'true');
                },
              },
            }),
          ),
        ),
      ]),
      toggle('سطح شیشه‌ای', settings.appearance.glass, (value) => patch({ appearance: { glass: value } })),
      toggle(
        'حالت پنهان',
        settings.appearance.privacy,
        (value) => patch({ appearance: { privacy: value } }),
        'اعداد سبد و نرخ‌ها، کارها و یادداشت‌ها محو می‌شوند؛ با بردن موس روی هر کدام دیده می‌شود. کلید H.',
      ),
      toggle('ارقام فارسی', settings.appearance.persianDigits, (value) =>
        patch({ appearance: { persianDigits: value } }, { rebuildAfter: true }),
      ),
      toggle(
        'حرکت کمتر',
        settings.appearance.reduceMotion,
        (value) => patch({ appearance: { reduceMotion: value } }),
        'انیمیشن‌ها به محو شدن ساده تبدیل می‌شوند.',
      ),
    ]);

  return build();
}
