/**
 * تبدیل ارز و طلا به ریال/تومان و برعکس، از روی نرخ‌های بازار.
 *
 * نرخ‌های داخلی tgju به ریال‌اند؛ نمادهای دلاری (انس، بیت‌کوین) با نرخ دلار
 * به ریال می‌رسند. این ماژول فقط حساب می‌کند و هیچ داده‌ای نمی‌گیرد.
 */

import { normalizeText } from './text.js';
import { toEnDigits } from './format.js';

export const DOLLAR_ID = 'price_dollar_rl';

/** نام‌ها و نشانه‌هایی که کاربر برای هر نماد تایپ می‌کند. */
const ALIASES = {
  price_dollar_rl: ['دلار', 'دلار آمریکا', 'usd', '$', 'dollar', 'dollars'],
  price_eur: ['یورو', 'eur', '€', 'euro', 'euros'],
  price_gbp: ['پوند', 'gbp', '£', 'pound', 'pounds'],
  price_aed: ['درهم', 'aed', 'dirham'],
  price_try: ['لیر', 'try', 'lira'],
  price_cad: ['دلار کانادا', 'cad'],
  sekee: ['سکه', 'سکه امامی', 'سکه تمام', 'coin'],
  nim: ['نیم سکه', 'نیم‌سکه'],
  rob: ['ربع سکه', 'ربع‌سکه'],
  geram18: ['طلا', 'گرم طلا', 'طلای ۱۸', 'طلای 18', 'gold'],
  geram24: ['طلای ۲۴', 'طلای 24'],
  silver_999: ['نقره', 'گرم نقره', 'نقره ۹۹۹', 'نقره 999', 'silver'],
  silver_925: ['نقره ۹۲۵', 'نقره 925'],
  'crypto-bitcoin': ['بیت کوین', 'بیت‌کوین', 'btc', 'bitcoin'],
  'crypto-ethereum': ['اتریوم', 'eth', 'ethereum'],
  'crypto-tether-irr': ['تتر', 'usdt', 'tether'],
};

const LOOKUP = new Map(
  Object.entries(ALIASES).flatMap(([id, names]) => names.map((name) => [normalizeText(toEnDigits(name)), id])),
);

/**
 * «۱۰۰ دلار»، «2.5 btc»، «$50»، «۳ سکه به تومان» → {amount, symbolId}.
 * @returns {{amount:number, symbolId:string}|null}
 */
export function parseConversion(text) {
  const cleaned = normalizeText(toEnDigits(text))
    .replace(/٫/g, '.')
    .replace(/[,،٬]/g, '')
    .replace(/\s*(?:به|to|in)\s*(?:تومان|ریال|toman|rial|irr)\s*$/, '')
    .trim();

  const match =
    /^(\d+(?:\.\d+)?)\s*([^\d\s].*?)$/.exec(cleaned) ?? /^([^\d\s]+?)\s*(\d+(?:\.\d+)?)$/.exec(cleaned);
  if (!match) return null;

  const [amountText, unitText] = /^\d/.test(match[1]) ? [match[1], match[2]] : [match[2], match[1]];
  const symbolId = LOOKUP.get(unitText.trim());
  const amount = Number(amountText);
  if (!symbolId || !Number.isFinite(amount) || amount <= 0) return null;
  return { amount, symbolId };
}

/**
 * ارزش ریالی یک واحد از نماد.
 * @param {string} symbolId
 * @param {Map<string, number>} prices قیمت خام هر نماد (ریال یا دلار، بسته به واحد نماد)
 * @param {Record<string, {unit:string}>} meta
 * @returns {number|null}
 */
export function rialValueOf(symbolId, prices, meta) {
  const price = prices.get(symbolId);
  if (!Number.isFinite(price)) return null;
  const unit = meta[symbolId]?.unit;
  if (unit === 'usd') {
    const dollar = prices.get(DOLLAR_ID);
    return Number.isFinite(dollar) ? price * dollar : null;
  }
  if (unit === 'index') return null; // شاخص بورس قیمت نیست
  return price;
}

/**
 * @returns {number|null} مبلغ به ریال
 */
export function convertToRial(amount, symbolId, prices, meta) {
  const unitValue = rialValueOf(symbolId, prices, meta);
  return unitValue == null ? null : amount * unitValue;
}

/** ریال → چند واحد از نماد. */
export function convertFromRial(rial, symbolId, prices, meta) {
  const unitValue = rialValueOf(symbolId, prices, meta);
  return unitValue ? rial / unitValue : null;
}
