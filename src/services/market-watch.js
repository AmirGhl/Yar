/**
 * کارهای پس از هر بار گرفتن نرخ‌ها (فقط در سرویس‌ورکر):
 * ثبت نمونه در تاریخچهٔ محلی و سنجیدن هشدارهای قیمت.
 *
 * خطای این مرحله هرگز نباید پاسخ نرخ‌ها به صفحه را خراب کند؛ صدازننده آن را می‌بلعد.
 */

import { appendSamples } from '../lib/history.js';
import { evaluateAlerts } from '../lib/alerts.js';
import { MARKET_SYMBOLS } from '../core/defaults.js';
import { formatNumber } from '../lib/format.js';

export const HISTORY_KEY = 'yar:market-history';
export const ALERTS_KEY = 'yar:alerts';

const META = Object.fromEntries(MARKET_SYMBOLS.map((item) => [item.id, item]));

/** قیمت خام → متن خوانا برای اعلان (تومان/ریال یا دلار). */
function priceLabel(symbolId, raw, currencyUnit) {
  const meta = META[symbolId];
  if (meta?.unit === 'usd') return `$${formatNumber(raw, { maximumFractionDigits: 2 })}`;
  if (meta?.unit === 'index') return formatNumber(raw);
  return currencyUnit === 'rial' ? `${formatNumber(raw)} ریال` : `${formatNumber(raw / 10)} تومان`;
}

async function notifyFired(fired, settings) {
  if (!fired.length || !chrome.notifications) return;
  const granted = await chrome.permissions.contains({ permissions: ['notifications'] });
  if (!granted) return;
  const unit = settings?.market?.currencyUnit ?? 'toman';
  for (const alert of fired) {
    const label = META[alert.symbolId]?.label ?? alert.symbolId;
    const verb = alert.direction === 'above' ? 'بالاتر از' : 'پایین‌تر از';
    chrome.notifications.create(`yar:alert:${alert.id}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('src/assets/icons/icon-128.png'),
      title: `هشدار قیمت: ${label}`,
      message: `${label} ${verb} ${priceLabel(alert.symbolId, alert.target, unit)} رفت — الان ${priceLabel(alert.symbolId, alert.firedPrice, unit)}`,
      priority: 2,
    });
  }
}

/**
 * @param {Array<{id:string, price:number}>} rows نرخ‌های تازه
 */
export async function watchMarket(rows) {
  if (!rows?.length) return;
  const stored = await chrome.storage.local.get([HISTORY_KEY, ALERTS_KEY, 'yar:settings']);
  const history = appendSamples(stored[HISTORY_KEY] ?? {}, rows);
  const prices = new Map(rows.map((row) => [row.id, row.price]));
  const { alerts, fired } = evaluateAlerts(stored[ALERTS_KEY] ?? [], prices);

  const writes = { [HISTORY_KEY]: history };
  if (fired.length) writes[ALERTS_KEY] = alerts;
  await chrome.storage.local.set(writes);
  await notifyFired(fired, stored['yar:settings']);
}
