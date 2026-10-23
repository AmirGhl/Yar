/**
 * مقایسهٔ نسخه‌ها و خواندن نشانی مخزن گیت‌هاب — بدون هیچ وابستگی.
 *
 * نسخهٔ کروم چهار عدد نقطه‌دار است (۱٫۶٫۰ یا ۱٫۶٫۰٫۲)؛ برچسب انتشار گیت‌هاب معمولاً
 * با «v» شروع می‌شود (v1.7.0). هر دو یکسان خوانده می‌شوند.
 */

/** «v1.7.0»، «1.7»، «۱٫۷٫۰» → [1, 7, 0] ؛ نامعتبر → null */
export function parseVersion(text) {
  const clean = String(text ?? '')
    .trim()
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/^v/i, '')
    // پسوندهای پیش‌انتشار (‎-beta) نسخهٔ پایدار حساب نمی‌شوند؛ عدد پایه‌شان خوانده می‌شود
    .replace(/[-+].*$/, '');
  if (!/^\d+(\.\d+){0,3}$/.test(clean)) return null;
  return clean.split('.').map(Number);
}

/** -1 یعنی a قدیمی‌تر، 0 برابر، 1 جدیدتر. نسخهٔ نامعتبر همیشه قدیمی‌تر حساب می‌شود. */
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x && !y) return 0;
  if (!x) return -1;
  if (!y) return 1;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0);
    if (diff) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export const isNewer = (candidate, current) => compareVersions(candidate, current) > 0;

/**
 * «owner/repo»، «https://github.com/owner/repo»، «github.com/owner/repo.git» → «owner/repo»
 * @returns {string|null}
 */
export function parseRepo(input) {
  const text = String(input ?? '').trim();
  if (!text) return null;
  const match = /^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i.exec(text);
  if (!match) return null;
  const [, owner, repo] = match;
  if (owner === '.' || owner === '..' || repo === '.' || repo === '..') return null;
  return `${owner}/${repo}`;
}

/**
 * متن تغییرات انتشار (مارک‌داون گیت‌هاب) → سطرهای ساده برای نمایش امن (بدون HTML).
 * @returns {Array<{kind:'heading'|'item'|'text', text:string}>}
 */
export function parseReleaseNotes(markdown, { maxLines = 40 } = {}) {
  const lines = [];
  // محتوای اسکریپت و استایل اصلاً متن نیست؛ پیش از هر چیز کامل دور ریخته می‌شود
  const cleaned = String(markdown ?? '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  for (const raw of cleaned.split(/\r?\n/)) {
    const line = raw
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // تصویر
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // پیوند → متنش
      .replace(/[*_`~]{1,3}([^*_`~]+)[*_`~]{1,3}/g, '$1') // تأکید و کد
      .replace(/<[^>]+>/g, '')
      .trim();
    if (!line) continue;
    const heading = /^#{1,6}\s+(.+)$/.exec(line);
    const item = /^(?:[-*+]|\d+[.)])\s+(.+)$/.exec(line);
    if (heading) lines.push({ kind: 'heading', text: heading[1] });
    else if (item) lines.push({ kind: 'item', text: item[1] });
    else lines.push({ kind: 'text', text: line });
    if (lines.length >= maxLines) break;
  }
  return lines;
}

/** آیا این وضعیت «نسخهٔ تازه‌ای که هنوز باید خبرش را داد» است؟ */
export function shouldAnnounce(state, { now = Date.now(), current } = {}) {
  if (state?.status !== 'available' || !state.latest?.version) return false;
  if (current && !isNewer(state.latest.version, current)) return false; // همین الان نصبش کرده‌ایم
  if (state.dismissedVersion === state.latest.version) return false;
  if (state.snoozedUntil && state.snoozedUntil > now) return false;
  return true;
}
