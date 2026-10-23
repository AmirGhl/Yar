/** یکسان‌سازی متن فارسی برای جست‌وجو و مقایسه (نه برای نمایش). */

const LETTER_ALIASES = [
  [/[يى]/g, 'ی'],
  [/ك/g, 'ک'],
  [/[ۀة]/g, 'ه'],
  [/[أإآ]/g, 'ا'],
  [/ؤ/g, 'و'],
];

/**
 * حروف عربی به فارسی، حذف نیم‌فاصله، اعراب و فاصله‌های تکراری، و حروف کوچک لاتین.
 * «کتاب‌ها» و «كتابها» یکی می‌شوند.
 */
export function normalizeText(input) {
  let out = String(input ?? '').toLowerCase();
  for (const [pattern, replacement] of LETTER_ALIASES) out = out.replace(pattern, replacement);
  return out
    .replace(/[ً-ٰٟ]/g, '') // اعراب
    .replace(/[‌‍‎‏]/g, '') // نیم‌فاصله و نشانه‌های جهت
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * امتیاز تطبیق یک عبارت با یک متن: ۰ یعنی نامرتبط.
 * شروع کلمه بیشتر از وسط کلمه امتیاز می‌گیرد؛ همهٔ کلمه‌های عبارت باید پیدا شوند.
 */
export function matchScore(query, text) {
  const q = normalizeText(query);
  if (!q) return 1;
  const target = normalizeText(text);
  let score = 0;
  for (const word of q.split(' ')) {
    const index = target.indexOf(word);
    if (index < 0) return 0;
    const atWordStart = index === 0 || target[index - 1] === ' ';
    score += atWordStart ? 3 : 1;
    if (index === 0) score += 2;
  }
  return score;
}
