/** یک روز در سه تقویم: شمسی، میلادی و قمری — برای نمایش کنار هم. */

import { toJalali, persianWeekday, JALALI_MONTHS, JALALI_WEEKDAYS } from './jalali.js';
import { toHijri } from './hijri.js';
import { toFaDigits } from './format.js';

export const GREGORIAN_MONTHS = [
  'ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن',
  'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر',
];

/** فاصلهٔ دو تاریخ بر حسب روز تقویمی (نه ۲۴ ساعت — تغییر ساعت تابستانی بی‌اثر است). */
export function daysBetween(from, to) {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

/** «امروز»، «فردا»، «۳ روز دیگر»، «۵ روز پیش». */
export function relativeDays(days, { persianDigits = true } = {}) {
  const digits = (value) => (persianDigits ? toFaDigits(value) : String(value));
  if (days === 0) return 'امروز';
  if (days === 1) return 'فردا';
  if (days === -1) return 'دیروز';
  if (days === 2) return 'پس‌فردا';
  return days > 0 ? `${digits(days)} روز دیگر` : `${digits(-days)} روز پیش`;
}

/**
 * @param {Date} date
 * @returns {{weekday:string, jalali:string, gregorian:string, hijri:string|null}}
 */
export function describeDate(date, { persianDigits = true } = {}) {
  const digits = (value) => (persianDigits ? toFaDigits(value) : String(value));
  const j = toJalali(date);
  const h = toHijri(date);
  return {
    weekday: JALALI_WEEKDAYS[persianWeekday(date)],
    jalali: `${digits(j.jd)} ${JALALI_MONTHS[j.jm - 1]} ${digits(j.jy)}`,
    gregorian: `${digits(date.getDate())} ${GREGORIAN_MONTHS[date.getMonth()]} ${digits(date.getFullYear())}`,
    hijri: h ? `${digits(h.hd)} ${h.monthName} ${digits(h.hy)}` : null,
  };
}
