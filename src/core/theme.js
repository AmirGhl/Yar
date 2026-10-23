/** اعمال تنظیمات ظاهری روی ریشهٔ سند. تنها جایی که استایل‌های سراسری نوشته می‌شوند. */

import { WALLPAPERS } from './defaults.js';

/** شناسهٔ پس‌زمینهٔ «تصویر روز بینگ» — در فهرست WALLPAPERS نیست چون CSS ثابت ندارد. */
export const DAILY_WALLPAPER_ID = 'bing';
const DAILY_URL_KEY = 'yar:daily-wallpaper-url';

/**
 * آخرین نشانی تصویر روز. در localStorage هم می‌ماند تا تب جدید بعدی، پیش از رسیدن
 * پاسخ سرویس‌ورکر، همان تصویر دیروز را نشان دهد و پس‌زمینه یک لحظه به شیب نپرد.
 */
let dailyUrl = (() => {
  try {
    return localStorage.getItem(DAILY_URL_KEY);
  } catch {
    return null;
  }
})();

export function setDailyWallpaper(url) {
  dailyUrl = url;
  try {
    if (url) localStorage.setItem(DAILY_URL_KEY, url);
    else localStorage.removeItem(DAILY_URL_KEY);
  } catch {
    // حافظهٔ مرورگر در دسترس نیست؛ فقط دفعهٔ بعد یک لحظه شیب دیده می‌شود
  }
}

/**
 * @param {object} settings
 * @param {Document} doc
 */
export function applyAppearance(settings, doc = document) {
  const root = doc.documentElement;
  const { theme, accent, wallpaper, customWallpaper, wallpaperDim, glass, reduceMotion } = settings.appearance;

  const resolved =
    theme === 'auto' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme;
  root.dataset.theme = resolved;
  root.dataset.glass = glass ? 'on' : 'off';
  root.dataset.motion = reduceMotion ? 'reduced' : 'full';
  root.dataset.private = settings.appearance.privacy ? 'on' : 'off';

  root.style.setProperty('--accent', accent);
  root.style.setProperty('--wallpaper-dim', String(wallpaperDim));

  const preset = WALLPAPERS.find((item) => item.id === wallpaper) ?? WALLPAPERS[0];
  let layer = preset.css;
  if (customWallpaper) layer = `url("${customWallpaper}")`;
  // شیب زیر تصویر می‌ماند: تا تصویر بار شود (یا اگر نشد) صفحه سیاه و خالی نیست
  else if (wallpaper === DAILY_WALLPAPER_ID && dailyUrl) layer = `url("${dailyUrl}"), ${WALLPAPERS[0].css}`;
  root.style.setProperty('--wallpaper', layer);
}

/**
 * وقتی تم روی «هماهنگ با سیستم» است، تغییر تم سیستم باید فوراً دیده شود.
 * @returns {() => void} لغو اشتراک
 */
export function watchSystemTheme(getSettings, onChange) {
  const media = window.matchMedia('(prefers-color-scheme: light)');
  const handler = () => {
    if (getSettings().appearance.theme === 'auto') onChange();
  };
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}
