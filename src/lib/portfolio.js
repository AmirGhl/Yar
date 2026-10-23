/**
 * ارزش‌گذاری سبد دارایی: «۲ سکه + ۵۰ گرم نقره + ۱۰۰ دلار» چقدر می‌ارزد؟
 *
 * همه‌چیز به ریال حساب می‌شود (واحد خام tgju)؛ تبدیل به تومان کار نمایش است.
 * تغییر امروز از درصد تغییر روزانهٔ هر نماد بازسازی می‌شود: اگر قیمت امروز
 * p است و تغییر روز c٪، ارزش دیروز p ÷ (1 + c/100) بوده.
 */

import { convertToRial } from './convert.js';

/**
 * @typedef {{id:string, symbolId:string, amount:number, buyPrice?:number|null}} Holding
 *   `buyPrice` قیمت خرید هر واحد به واحد خام نماد (اختیاری، برای سود/زیان)
 */

/**
 * @param {Holding[]} holdings
 * @param {Map<string, {price:number, changePercent:number}>} rows نرخ‌های فعلی
 * @param {Record<string, {unit:string}>} meta
 * @returns {{total:number, dayChange:number, dayChangePercent:number, cost:number|null, profit:number|null,
 *            items:Array<Holding & {value:number|null, share:number, dayChange:number, profit:number|null, profitPercent:number|null}>,
 *            missing:string[]}}
 */
export function valuePortfolio(holdings, rows, meta) {
  const prices = new Map([...rows].map(([id, row]) => [id, row.price]));
  const items = [];
  const missing = [];
  let total = 0;
  let yesterday = 0;
  let cost = 0;
  let costCovered = 0;

  for (const holding of holdings) {
    const value = convertToRial(holding.amount, holding.symbolId, prices, meta);
    if (value == null) {
      missing.push(holding.symbolId);
      items.push({ ...holding, value: null, share: 0, dayChange: 0, profit: null, profitPercent: null });
      continue;
    }
    const percent = Number(rows.get(holding.symbolId)?.changePercent) || 0;
    const before = value / (1 + percent / 100);
    total += value;
    yesterday += before;

    let profit = null;
    let profitPercent = null;
    if (Number.isFinite(holding.buyPrice) && holding.buyPrice > 0) {
      // قیمت خرید به واحد خام نماد است؛ برای نمادهای دلاری ارزش ریالی خرید با نرخ دلار امروز سنجیده می‌شود
      const paid = convertToRial(holding.amount, holding.symbolId, new Map([...prices, [holding.symbolId, holding.buyPrice]]), meta);
      if (paid) {
        profit = value - paid;
        profitPercent = (profit / paid) * 100;
        cost += paid;
        costCovered += value;
      }
    }
    items.push({ ...holding, value, share: 0, dayChange: value - before, profit, profitPercent });
  }

  for (const item of items) item.share = total && item.value ? item.value / total : 0;
  items.sort((a, b) => (b.value ?? -1) - (a.value ?? -1));

  return {
    total,
    dayChange: total - yesterday,
    dayChangePercent: yesterday ? ((total - yesterday) / yesterday) * 100 : 0,
    cost: cost || null,
    profit: cost ? costCovered - cost : null,
    items,
    missing,
  };
}
