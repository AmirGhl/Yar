/**
 * تاریخ هجری قمری با تقویم ام‌القری مرورگر.
 * تقویم رسمی ایران گاهی یک روز اختلاف دارد؛ خروجی این ماژول «تقریبی» است.
 */

export const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربیع‌الاول', 'ربیع‌الثانی', 'جمادی‌الاول', 'جمادی‌الثانی',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذی‌القعده', 'ذی‌الحجه',
];

let partsFormatter = null;

function formatter() {
  if (!partsFormatter) {
    partsFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return partsFormatter;
}

/**
 * @param {Date} date
 * @param {number} offsetDays تنظیم دستی کاربر برای هم‌خوانی با رؤیت هلال محلی.
 * @returns {{hy:number, hm:number, hd:number, monthName:string}|null}
 */
export function toHijri(date = new Date(), offsetDays = 0) {
  try {
    const shifted = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
    const parts = formatter().formatToParts(shifted);
    const pick = (type) => Number(parts.find((p) => p.type === type)?.value);
    const hy = pick('year');
    const hm = pick('month');
    const hd = pick('day');
    if (![hy, hm, hd].every(Number.isFinite)) return null;
    return { hy, hm, hd, monthName: HIJRI_MONTHS[hm - 1] ?? '' };
  } catch {
    return null;
  }
}
