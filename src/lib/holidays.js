/**
 * مناسبت‌های تقویم ایران: رویدادهای ثابتِ شمسی و رویدادهای قمری.
 *
 * رویدادهای قمری با تقویم ام‌القری مرورگر تطبیق داده می‌شوند و ممکن است
 * یک روز با تقویم رسمی ایران اختلاف داشته باشند؛ در رابط کاربری «تقریبی» علامت می‌خورند.
 */

import { toHijri } from './hijri.js';

/** رویدادهای شمسی: کلید «ماه/روز». holiday=true یعنی تعطیل رسمی. */
const SOLAR_EVENTS = {
  '1/1': [{ title: 'آغاز نوروز — جشن سال نو', holiday: true }],
  '1/2': [{ title: 'عید نوروز', holiday: true }],
  '1/3': [{ title: 'عید نوروز', holiday: true }],
  '1/4': [{ title: 'عید نوروز', holiday: true }],
  '1/12': [{ title: 'روز جمهوری اسلامی ایران', holiday: true }],
  '1/13': [{ title: 'روز طبیعت (سیزده‌بدر)', holiday: true }],
  '1/19': [{ title: 'روز هنر انقلاب اسلامی' }],
  '1/25': [{ title: 'روز بزرگداشت عطار نیشابوری' }],
  '2/1': [{ title: 'روز بزرگداشت سعدی' }],
  '2/3': [{ title: 'روز بزرگداشت شیخ بهایی و روز ملی کارآفرینی' }],
  '2/10': [{ title: 'روز ملی خلیج فارس' }],
  '2/12': [{ title: 'روز معلم' }],
  '2/25': [{ title: 'روز بزرگداشت فردوسی' }],
  '2/28': [{ title: 'روز بزرگداشت حکیم عمر خیام' }],
  '3/1': [{ title: 'روز بهره‌وری و بهینه‌سازی مصرف' }],
  '3/3': [{ title: 'سالروز آزادسازی خرمشهر' }],
  '3/14': [{ title: 'رحلت امام خمینی', holiday: true }],
  '3/15': [{ title: 'قیام ۱۵ خرداد', holiday: true }],
  '3/27': [{ title: 'روز جهاد کشاورزی' }],
  '3/29': [{ title: 'روز بزرگداشت جهانی صنایع دستی' }],
  '4/1': [{ title: 'روز اصناف' }],
  '4/10': [{ title: 'روز صنعت و معدن' }],
  '4/14': [{ title: 'روز قلم' }],
  '4/25': [{ title: 'روز بهزیستی و تأمین اجتماعی' }],
  '5/6': [{ title: 'روز ترویج آموزش‌های فنی و حرفه‌ای' }],
  '5/14': [{ title: 'سالروز صدور فرمان مشروطیت' }],
  '5/17': [{ title: 'روز خبرنگار' }],
  '5/30': [{ title: 'روز بزرگداشت علامه مجلسی' }],
  '6/1': [{ title: 'روز بزرگداشت ابوعلی سینا و روز پزشک' }],
  '6/4': [{ title: 'روز کارمند' }],
  '6/5': [{ title: 'روز بزرگداشت محمد بن زکریای رازی و روز داروسازی' }],
  '6/13': [{ title: 'روز بزرگداشت ابوریحان بیرونی' }],
  '6/27': [{ title: 'روز شعر و ادب فارسی و بزرگداشت شهریار' }],
  '6/31': [{ title: 'روز ملی گفت‌وگوی تمدن‌ها' }],
  '7/7': [{ title: 'روز آتش‌نشانی و ایمنی' }],
  '7/8': [{ title: 'روز بزرگداشت مولوی' }],
  '7/13': [{ title: 'روز نیروی انتظامی' }],
  '7/14': [{ title: 'روز دامپزشکی' }],
  '7/20': [{ title: 'روز بزرگداشت حافظ' }],
  '7/24': [{ title: 'روز پیوند اولیا و مربیان' }],
  '7/26': [{ title: 'روز تربیت بدنی و ورزش' }],
  '8/1': [{ title: 'روز آمار و برنامه‌ریزی' }],
  '8/13': [{ title: 'روز دانش‌آموز' }],
  '8/24': [{ title: 'روز کتاب و کتاب‌خوانی' }],
  '9/5': [{ title: 'روز بسیج مستضعفان' }],
  '9/16': [{ title: 'روز دانشجو' }],
  '9/20': [{ title: 'روز جهانی کوهنورد' }],
  '9/26': [{ title: 'روز پژوهش' }],
  '9/30': [{ title: 'شب یلدا — بلندترین شب سال' }],
  '10/5': [{ title: 'روز ملی ایمنی در برابر زلزله' }],
  '10/12': [{ title: 'روز صنعت پتروشیمی' }],
  '10/19': [{ title: 'روز ثبت احوال' }],
  '10/27': [{ title: 'روز وحدت حوزه و دانشگاه' }],
  '11/12': [{ title: 'بازگشت امام خمینی به ایران — آغاز دههٔ فجر' }],
  '11/19': [{ title: 'روز نیروی هوایی' }],
  '11/22': [{ title: 'پیروزی انقلاب اسلامی ایران', holiday: true }],
  '11/29': [{ title: 'روز اقتصاد مقاومتی و کارآفرینی' }],
  '12/5': [{ title: 'روز بزرگداشت خواجه نصیرالدین طوسی و روز مهندس' }],
  '12/8': [{ title: 'روز امور تربیتی و تربیت اسلامی' }],
  '12/15': [{ title: 'روز درخت‌کاری' }],
  '12/25': [{ title: 'روز بزرگداشت پروین اعتصامی' }],
  '12/29': [{ title: 'روز ملی شدن صنعت نفت ایران', holiday: true }],
};

/** رویدادهای قمری: کلید «ماه/روز» هجری قمری. */
const LUNAR_EVENTS = {
  '1/9': [{ title: 'تاسوعای حسینی', holiday: true }],
  '1/10': [{ title: 'عاشورای حسینی', holiday: true }],
  '2/20': [{ title: 'اربعین حسینی', holiday: true }],
  '2/28': [{ title: 'رحلت پیامبر اکرم و شهادت امام حسن مجتبی', holiday: true }],
  '2/29': [{ title: 'شهادت امام رضا', holiday: true }],
  '3/8': [{ title: 'شهادت امام حسن عسکری', holiday: true }],
  '3/17': [{ title: 'میلاد پیامبر اکرم و امام جعفر صادق', holiday: true }],
  '6/3': [{ title: 'شهادت حضرت فاطمهٔ زهرا', holiday: true }],
  '7/13': [{ title: 'ولادت امام علی و روز پدر', holiday: true }],
  '7/27': [{ title: 'مبعث رسول اکرم', holiday: true }],
  '8/15': [{ title: 'ولادت حضرت مهدی — جشن نیمهٔ شعبان', holiday: true }],
  '9/1': [{ title: 'آغاز ماه رمضان' }],
  '9/21': [{ title: 'شهادت امام علی', holiday: true }],
  '9/23': [{ title: 'شب قدر' }],
  '10/1': [{ title: 'عید سعید فطر', holiday: true }],
  '10/2': [{ title: 'تعطیل به مناسبت عید فطر', holiday: true }],
  '10/25': [{ title: 'شهادت امام جعفر صادق', holiday: true }],
  '12/10': [{ title: 'عید سعید قربان', holiday: true }],
  '12/18': [{ title: 'عید سعید غدیر خم', holiday: true }],
};

/**
 * مناسبت‌های یک روز.
 *
 * @param {{jm:number, jd:number}} jalali تاریخ شمسی
 * @param {Date} date همان روز به میلادی (برای محاسبهٔ تاریخ قمری)
 * @param {{weekday?:number}} options
 * @returns {{events:Array<{title:string, holiday:boolean, lunar:boolean}>, isHoliday:boolean}}
 */
export function getOccasions(jalali, date, { weekday } = {}) {
  const events = [];

  for (const item of SOLAR_EVENTS[`${jalali.jm}/${jalali.jd}`] ?? []) {
    events.push({ title: item.title, holiday: Boolean(item.holiday), lunar: false });
  }

  const hijri = toHijri(date);
  if (hijri) {
    for (const item of LUNAR_EVENTS[`${hijri.hm}/${hijri.hd}`] ?? []) {
      events.push({ title: item.title, holiday: Boolean(item.holiday), lunar: true });
    }
  }

  const isFriday = weekday === 6;
  return {
    events,
    isHoliday: isFriday || events.some((item) => item.holiday),
    isFriday,
  };
}

/**
 * تعطیلات رسمی پیش رو (جمعه‌ها حساب نمی‌شوند — آن‌ها را همه می‌دانند).
 *
 * @param {Date} from روز شروع (خودش هم بررسی می‌شود)
 * @param {(date:Date) => {jm:number, jd:number}} toJalali تبدیل‌گر، تا این ماژول به jalali وابسته نشود
 * @param {{days?:number, limit?:number}} options
 * @returns {Array<{date:Date, inDays:number, title:string}>}
 */
export function upcomingHolidays(from, toJalali, { days = 120, limit = 3 } = {}) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const out = [];
  // یک ردیف اضافه جمع می‌کنیم تا طول آخرین تعطیلی کامل شمرده شود، بعد کوتاهش می‌کنیم
  for (let offset = 0; offset <= days && out.length <= limit; offset += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    const holiday = getOccasions(toJalali(date), date).events.find((event) => event.holiday);
    if (!holiday) continue;
    // تعطیلات پشت‌سرهم (نوروز، تاسوعا و عاشورا) یک ردیف‌اند با طول چندروزه
    const last = out.at(-1);
    if (last && last.inDays + last.span === offset) last.span += 1;
    else out.push({ date, inDays: offset, span: 1, title: holiday.title });
  }
  if (out.length > limit) out.length = limit;
  return out;
}
