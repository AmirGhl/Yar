/**
 * پل ارتباطی صفحه ↔ سرویس‌ورکر.
 * همهٔ درخواست‌های شبکه از سرویس‌ورکر رد می‌شوند تا از محدودیت CORS عبور کنند
 * و کش مشترک بین تب جدید و پاپ‌آپ حفظ شود.
 */

export const MESSAGE = {
  weather: 'weather:get',
  air: 'air:get',
  geocode: 'geo:search',
  market: 'market:get',
  marketHistory: 'market:history',
  news: 'news:get',
  suggest: 'search:suggest',
  topSites: 'sites:top',
  bookmarks: 'bookmarks:get',
  bookmarksSearch: 'bookmarks:search',
  /** زمان پایان تایمر به سرویس‌ورکر سپرده می‌شود تا اعلان حتی با تب بسته برسد. */
  timerSchedule: 'timer:schedule',
  bing: 'wallpaper:bing',
  /** بررسی فوری نسخهٔ تازه در گیت‌هاب (دکمهٔ «بررسی کن» در تنظیمات) */
  updateCheck: 'update:check',
};

/**
 * ارسال پیام و برگرداندن پاسخ.
 * سرویس‌ورکر همیشه `{ok:true, data}` یا `{ok:false, error}` برمی‌گرداند.
 *
 * @throws {Error} با پیام فارسیِ قابل نمایش
 */
export async function send(type, payload = {}) {
  let response;
  try {
    response = await chrome.runtime.sendMessage({ type, payload });
  } catch (cause) {
    throw new Error('ارتباط با افزونه برقرار نشد. صفحه را دوباره باز کنید.', { cause });
  }
  if (!response) throw new Error('پاسخی از افزونه دریافت نشد.');
  if (!response.ok) throw new Error(response.error || 'خطای ناشناخته');
  return response.data;
}
