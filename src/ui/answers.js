/**
 * پاسخ فوری برای عبارت تایپ‌شده: حساب («۲۵×۴») یا تبدیل («۱۰۰ دلار»).
 * مشترک بین نوار جست‌وجو و پالت فرمان؛ نرخ‌ها از کش سرویس‌ورکر می‌آیند.
 */

import { MESSAGE, send } from '../core/messaging.js';
import { MARKET_SYMBOLS } from '../core/defaults.js';
import { evaluate } from '../lib/calc.js';
import { parseConversion, convertToRial, DOLLAR_ID } from '../lib/convert.js';
import { formatNumber, compactNumber } from '../lib/format.js';

const META = Object.fromEntries(MARKET_SYMBOLS.map((item) => [item.id, item]));

/**
 * @returns {Promise<{kind:'calc'|'convert', title:string, detail:string, copyText:string}|null>}
 */
export async function quickAnswer(query, settings) {
  const persianDigits = settings.appearance.persianDigits;

  const value = evaluate(query);
  if (value != null) {
    const rounded = Math.round(value * 1e10) / 1e10;
    return {
      kind: 'calc',
      title: `= ${formatNumber(rounded, { persianDigits, maximumFractionDigits: 10 })}`,
      detail: 'ماشین‌حساب · Enter برای رونوشت',
      copyText: String(rounded),
    };
  }

  const conversion = parseConversion(query);
  if (!conversion) return null;

  const response = await send(MESSAGE.market, { symbols: [conversion.symbolId, DOLLAR_ID] });
  const prices = new Map(response.rows.map((row) => [row.id, row.price]));
  const rial = convertToRial(conversion.amount, conversion.symbolId, prices, META);
  if (rial == null) return null;

  const asRial = settings.market.currencyUnit === 'rial';
  const local = asRial ? rial : rial / 10;
  const unit = asRial ? 'ریال' : 'تومان';
  const label = META[conversion.symbolId]?.label ?? conversion.symbolId;
  return {
    kind: 'convert',
    title: `${formatNumber(local, { persianDigits })} ${unit}`,
    detail: `${formatNumber(conversion.amount, { persianDigits, maximumFractionDigits: 4 })} ${label} · حدود ${compactNumber(local, { persianDigits })}${response.stale ? ' · آفلاین' : ''}`,
    copyText: String(Math.round(local)),
  };
}
