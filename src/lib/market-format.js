/**
 * نمایش و ورود قیمت‌های بازار به واحد کاربر.
 *
 * قیمت خام tgju برای نرخ‌های داخلی ریال است و برای جهانی‌ها دلار. کاربر اما
 * تومان (یا ریال، بسته به تنظیم) می‌بیند و تایپ می‌کند. این دو تابع مرز همین
 * تبدیل‌اند، تا هیچ‌جای دیگری «تقسیم بر ۱۰» را دستی تکرار نکند.
 */

import { formatNumber } from './format.js';

/** واحد نمایشی یک نماد: «تومان»، «ریال»، «دلار» یا «واحد». */
export function unitLabel(meta, currencyUnit = 'toman') {
  if (meta?.unit === 'usd') return 'دلار';
  if (meta?.unit === 'index') return 'واحد';
  return currencyUnit === 'rial' ? 'ریال' : 'تومان';
}

/** قیمت خام → عدد به واحد نمایشی کاربر. */
export function toDisplay(meta, raw, currencyUnit = 'toman') {
  if (!Number.isFinite(raw)) return null;
  if (meta?.unit === 'usd' || meta?.unit === 'index') return raw;
  return currencyUnit === 'rial' ? raw : raw / 10;
}

/** عدد تایپ‌شده به واحد نمایشی → قیمت خام (برای مقایسه با tgju). */
export function fromDisplay(meta, value, currencyUnit = 'toman') {
  if (!Number.isFinite(value)) return null;
  if (meta?.unit === 'usd' || meta?.unit === 'index') return value;
  return currencyUnit === 'rial' ? value : value * 10;
}

/** متن کامل قیمت: «$۵۳٫۹۶» یا «۴۹۴,۳۹۰». */
export function formatPrice(meta, raw, { currencyUnit = 'toman', persianDigits = true } = {}) {
  const value = toDisplay(meta, raw, currencyUnit);
  if (value == null) return '—';
  if (meta?.unit === 'usd') return `$${formatNumber(value, { persianDigits, maximumFractionDigits: 2 })}`;
  return formatNumber(value, { persianDigits });
}
