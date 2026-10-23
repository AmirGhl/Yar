/**
 * هشدار قیمت: «اگر دلار از X بالاتر رفت / پایین‌تر آمد خبرم کن».
 *
 * هر هشدار یک‌بار مصرف است: وقتی شرطش برقرار شد خاموش می‌شود تا با هر نوسان
 * کوچک دوباره و دوباره اعلان نفرستد. کاربر می‌تواند دوباره روشنش کند.
 *
 * `target` به واحد خام همان نماد است (ریال برای نرخ‌های داخلی، دلار برای جهانی‌ها)
 * تا مقایسه مستقیم با قیمت tgju باشد؛ تبدیل تومان فقط کار لایهٔ نمایش است.
 */

export const MAX_ALERTS = 40;

/**
 * @typedef {{id:string, symbolId:string, direction:'above'|'below', target:number,
 *            active:boolean, createdAt:number, firedAt?:number|null, firedPrice?:number|null}} PriceAlert
 */

/** @returns {PriceAlert} */
export function createAlert({ symbolId, direction, target }, now = Date.now()) {
  if (!symbolId) throw new Error('نماد مشخص نیست');
  if (direction !== 'above' && direction !== 'below') throw new Error('جهت هشدار نامعتبر است');
  if (!Number.isFinite(target) || target <= 0) throw new Error('قیمت هدف معتبر نیست');
  const id = globalThis.crypto?.randomUUID?.() ?? `a-${now}-${Math.random().toString(36).slice(2)}`;
  return { id, symbolId, direction, target, active: true, createdAt: now, firedAt: null, firedPrice: null };
}

/** آیا قیمت فعلی شرط هشدار را برآورده می‌کند؟ */
export function isTriggered(alert, price) {
  if (!Number.isFinite(price)) return false;
  return alert.direction === 'above' ? price >= alert.target : price <= alert.target;
}

/**
 * هشدارهای فعال را با قیمت‌های تازه می‌سنجد.
 * @param {PriceAlert[]} alerts
 * @param {Map<string, number>} prices
 * @returns {{alerts:PriceAlert[], fired:PriceAlert[]}} فهرست به‌روز و آن‌هایی که همین الان زدند
 */
export function evaluateAlerts(alerts, prices, now = Date.now()) {
  const fired = [];
  const next = (Array.isArray(alerts) ? alerts : []).map((alert) => {
    if (!alert?.active) return alert;
    const price = prices.get(alert.symbolId);
    if (!isTriggered(alert, price)) return alert;
    const done = { ...alert, active: false, firedAt: now, firedPrice: price };
    fired.push(done);
    return done;
  });
  return { alerts: next, fired };
}
