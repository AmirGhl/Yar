/**
 * نشانِ جایگزین سایت — وقتی favicon نمی‌آید.
 *
 * حرف اول روی خاکستری، دوازده کاشیِ یک‌شکل می‌سازد که چشم نمی‌تواند از هم
 * جدایشان کند. اینجا هر دامنه رنگ خودش را می‌گیرد؛ رنگ از نام میزبان
 * حساب می‌شود، نه تصادفی، پس کاشیِ هر سایت همیشه همان رنگ می‌ماند و
 * کاربر بعد از چند روز جای میان‌برهایش را با رنگ پیدا می‌کند، نه با خواندن.
 */

/** هش کوتاه و پایدار (FNV-1a) — فقط برای انتخاب رنگ، نه امنیت. */
function hash(text) {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/** نام میزبان بدون www — تا example.com و www.example.com یک رنگ بگیرند. */
function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return String(url);
  }
}

/** فامِ ثابت (۰ تا ۳۵۹) برای یک نشانی. */
export function siteHue(url) {
  return hash(hostOf(url)) % 360;
}

/**
 * حرف نمایشی کاشی. اگر عنوان با حرف شروع نشود (مثلاً «۱۲۳» یا ایموجی)
 * سراغ نام میزبان می‌رویم تا کاشی خالی نماند.
 */
export function siteInitial(title, url) {
  const source = (title || '').trim() || hostOf(url);
  return [...source][0]?.toUpperCase() ?? '؟';
}

/** کاشی رنگی جایگزین favicon. */
export function siteMark(title, url) {
  const node = document.createElement('span');
  node.className = 'shortcut__initial';
  node.style.setProperty('--tint', String(siteHue(url)));
  node.textContent = siteInitial(title, url);
  return node;
}
