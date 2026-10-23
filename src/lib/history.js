/**
 * تاریخچهٔ نرخ‌ها، ساخته‌شده روی خود دستگاه.
 *
 * tgju فقط قیمت لحظه‌ای می‌دهد؛ پس هر بار که نرخ‌ها گرفته می‌شوند (هر ۱۰ دقیقه
 * با زنگ سرویس‌ورکر، یا وقتی تب باز است) یک نمونه ذخیره می‌کنیم. هر ساعت یک
 * نقطه کافی است و بیش از ۷ روز نگه نمی‌داریم: حدود ۱۷۰ عدد برای هر نماد.
 *
 * شکل: { [symbolId]: Array<[timestamp, price]> } — مرتب از قدیم به جدید.
 */

export const HISTORY_BUCKET_MS = 60 * 60 * 1000;
export const HISTORY_KEEP_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * نمونه‌های تازه را به تاریخچه اضافه می‌کند (بدون تغییر ورودی).
 * در هر بازهٔ یک‌ساعته فقط آخرین قیمت می‌ماند.
 *
 * @param {Record<string, Array<[number, number]>>} history
 * @param {Array<{id:string, price:number}>} rows
 * @param {number} now
 */
export function appendSamples(history, rows, now = Date.now(), { bucketMs = HISTORY_BUCKET_MS, keepMs = HISTORY_KEEP_MS } = {}) {
  const out = {};
  const cutoff = now - keepMs;
  for (const [id, points] of Object.entries(history ?? {})) {
    if (!Array.isArray(points)) continue;
    const kept = points.filter((point) => Array.isArray(point) && point[0] >= cutoff && Number.isFinite(point[1]));
    if (kept.length) out[id] = kept;
  }
  for (const row of rows) {
    if (!row?.id || !Number.isFinite(row.price)) continue;
    const points = out[row.id] ? [...out[row.id]] : [];
    const last = points.at(-1);
    if (last && Math.floor(last[0] / bucketMs) === Math.floor(now / bucketMs)) points[points.length - 1] = [now, row.price];
    else points.push([now, row.price]);
    out[row.id] = points;
  }
  return out;
}

/**
 * خلاصهٔ یک سری برای نمایش: کمینه، بیشینه، تغییر از اولین نقطه.
 * @returns {{min:number, max:number, first:number, last:number, changePercent:number, count:number}|null}
 */
export function summarize(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const prices = points.map((point) => point[1]);
  const first = prices[0];
  const last = prices.at(-1);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    first,
    last,
    changePercent: first ? ((last - first) / first) * 100 : 0,
    count: points.length,
  };
}
