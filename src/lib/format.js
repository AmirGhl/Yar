/** قالب‌بندی اعداد، ارقام فارسی و زمان نسبی. */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** ارقام لاتین یک رشته را به فارسی تبدیل می‌کند. */
export function toFaDigits(input) {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/** ارقام فارسی/عربی یک رشته را به لاتین برمی‌گرداند (برای ورودی کاربر). */
export function toEnDigits(input) {
  return String(input)
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/٫/g, '.'); // ممیز فارسی
}

/** عدد را با جداکنندهٔ هزارگان و (اختیاری) ارقام فارسی برمی‌گرداند. */
export function formatNumber(value, { persianDigits = true, maximumFractionDigits = 0 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const s = n.toLocaleString('en-US', { maximumFractionDigits });
  // ممیز فارسی «٫» است؛ جداکنندهٔ هزارگان همان «,» آشنای نوار قیمت‌ها می‌ماند
  return persianDigits ? toFaDigits(s).replace('.', '٫') : s;
}

/** رشتهٔ قیمت خام tgju («۱,۸۹۴,۰۰۰» یا «1,894,000») را به عدد تبدیل می‌کند. */
export function parsePrice(raw) {
  const cleaned = toEnDigits(String(raw ?? '')).replace(/[^\d.\-]/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** دو رقمی کردن ساعت/دقیقه. */
export function pad2(n) {
  return String(n).padStart(2, '0');
}

/** دقیقه از نیمه‌شب → «HH:MM». */
export function minutesToClock(minutes, { persianDigits = true } = {}) {
  if (!Number.isFinite(minutes)) return '—';
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const s = `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
  return persianDigits ? toFaDigits(s) : s;
}

/** فاصلهٔ زمانی بر حسب دقیقه → «۲ ساعت و ۵ دقیقه». */
export function humanizeMinutes(minutes, { persianDigits = true } = {}) {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  const parts = [];
  if (h) parts.push(`${h} ساعت`);
  if (m || !h) parts.push(`${m} دقیقه`);
  const out = parts.join(' و ');
  return persianDigits ? toFaDigits(out) : out;
}

/** زمان نسبی فارسی: «۳ دقیقه پیش»، «دیروز». */
export function timeAgo(timestamp, { persianDigits = true } = {}) {
  const diff = Date.now() - Number(timestamp);
  if (!Number.isFinite(diff)) return '';
  const sec = Math.round(diff / 1000);
  let out;
  if (sec < 45) out = 'همین حالا';
  else if (sec < 3600) out = `${Math.round(sec / 60)} دقیقه پیش`;
  else if (sec < 86400) out = `${Math.round(sec / 3600)} ساعت پیش`;
  else if (sec < 172800) out = 'دیروز';
  else if (sec < 2592000) out = `${Math.round(sec / 86400)} روز پیش`;
  else out = `${Math.round(sec / 2592000)} ماه پیش`;
  return persianDigits ? toFaDigits(out) : out;
}

/** ریال → تومان (منابع بازار ایران قیمت را به ریال می‌دهند). */
export function rialToToman(rial) {
  return Number.isFinite(rial) ? rial / 10 : null;
}

/** عدد بزرگ را کوتاه می‌کند: ۱۲٫۵ میلیون. */
export function compactNumber(value, { persianDigits = true } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const units = [
    [1e9, 'میلیارد'],
    [1e6, 'میلیون'],
    [1e3, 'هزار'],
  ];
  for (const [size, label] of units) {
    if (abs >= size) {
      const scaled = (n / size).toFixed(abs / size >= 100 ? 0 : 1).replace(/\.0$/, '');
      const s = `${scaled} ${label}`;
      // ممیز فارسی «٫» است، نه نقطه
      return persianDigits ? toFaDigits(s).replace('.', '٫') : s;
    }
  }
  return formatNumber(n, { persianDigits });
}
