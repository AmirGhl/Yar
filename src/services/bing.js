/**
 * تصویر روز بینگ به‌عنوان پس‌زمینه — اختیاری و با مجوز جداگانهٔ دامنهٔ bing.com.
 *
 * فقط نشانی تصویر و اعتبار عکاس گرفته می‌شود؛ خود تصویر را مرورگر مستقیم بار
 * می‌کند و در حافظهٔ افزونه ذخیره نمی‌شود.
 */

import { withCache, fetchWithTimeout } from './cache.js';

const ORIGIN = 'https://www.bing.com';
export const BING_ORIGIN_PATTERN = `${ORIGIN}/*`;
const ENDPOINT = `${ORIGIN}/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US`;
// تصویر روز در ساعت‌های مختلف در مناطق مختلف عوض می‌شود؛ چند بار در روز سر زدن کافی است
const TTL = 6 * 60 * 60 * 1000;

/** یک ردیف خام API را به شکل یکنواخت درمی‌آورد؛ ساختار نامعتبر → خطا. */
export function normalizeBing(raw) {
  const image = raw?.images?.[0];
  // نشانی داخل url("…") در CSS می‌نشیند؛ فقط نویسه‌های امن یک مسیر پذیرفته می‌شوند
  if (!image || typeof image.urlbase !== 'string' || !/^\/[\w\-./?=&%]+$/.test(image.urlbase)) {
    throw new Error('ساختار پاسخ بینگ تغییر کرده است');
  }
  // دو اندازه: صفحه بسته به پهنای واقعی نمایشگر یکی را برمی‌دارد (UHD چند مگابایت است)
  return {
    url1080: `${ORIGIN}${image.urlbase}_1920x1080.jpg`,
    urlUhd: `${ORIGIN}${image.urlbase}_UHD.jpg`,
    title: String(image.title ?? ''),
    copyright: String(image.copyright ?? ''),
    link: /^https:\/\/www\.bing\.com\//.test(image.copyrightlink ?? '') ? image.copyrightlink : null,
    date: String(image.startdate ?? ''),
  };
}

export async function getBingWallpaper() {
  return withCache('bing', TTL, async () => {
    const response = await fetchWithTimeout(ENDPOINT, { headers: { Accept: 'application/json' } });
    return normalizeBing(await response.json());
  });
}
