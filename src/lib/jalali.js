/**
 * تبدیل تقویم میلادی ↔ هجری شمسی (الگوریتم استاندارد جلالی).
 * تنها مسئولیت این ماژول تبدیل تاریخ است؛ قالب‌بندی در format.js انجام می‌شود.
 */

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export const JALALI_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
export const JALALI_WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

// تقسیم و باقی‌مانده با گرد کردن به سمت صفر (نه floor) — الگوریتم جلالی به همین
// معنا وابسته است و استفاده از Math.floor مرزهای سال را یک روز جابه‌جا می‌کند.
const div = (a, b) => Math.trunc(a / b);
const mod = (a, b) => a - Math.trunc(a / b) * b;

/** روز جولیَن از تاریخ میلادی. */
export function gregorianToJdn(gy, gm, gd) {
  const d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
}

/** تاریخ میلادی از روز جولیَن. */
export function jdnToGregorian(jdn) {
  let j = 4 * jdn + 139361631;
  j += div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

/** پارامترهای سال جلالی: سال پایه، شروع میلادی و آرایهٔ نقاط شکست. */
function jalCal(jy) {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 1701, 1866,
    2020, 2317, 2394, 2456, 3178,
  ];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];

  if (jy < jp || jy >= breaks[bl - 1]) throw new RangeError(`سال جلالی خارج از بازه: ${jy}`);

  let jump = 0;
  let jm;
  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;

  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

/** آیا سال شمسی کبیسه است؟ */
export function isJalaliLeapYear(jy) {
  return jalCal(jy).leap === 0;
}

/** تعداد روزهای یک ماه شمسی. */
export function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function jalaliToJdn(jy, jm, jd) {
  const { gy, march } = jalCal(jy);
  return gregorianToJdn(gy, 3, march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

export function jdnToJalali(jdn) {
  const { gy } = jdnToGregorian(jdn);
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = gregorianToJdn(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

/** تاریخ میلادی (شیء Date) → تاریخ شمسی. */
export function toJalali(date = new Date()) {
  return jdnToJalali(gregorianToJdn(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}

/** تاریخ شمسی → شیء Date میلادی (ساعت محلی، نیمه‌شب). */
export function fromJalali(jy, jm, jd) {
  const { gy, gm, gd } = jdnToGregorian(jalaliToJdn(jy, jm, jd));
  return new Date(gy, gm - 1, gd);
}

/**
 * ایندکس روز هفته با مبدأ شنبه (۰=شنبه … ۶=جمعه).
 * getDay() جاوااسکریپت با یکشنبه شروع می‌شود، پس ۱+ و باقی‌ماندهٔ ۷.
 */
export function persianWeekday(date = new Date()) {
  return (date.getDay() + 1) % 7;
}

/** رشتهٔ کلید یکتا برای یک روز شمسی، مناسب برای مقایسه و ذخیره. */
export function jalaliKey(jy, jm, jd) {
  return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
}
