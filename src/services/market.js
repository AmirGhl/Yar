/**
 * قیمت لحظه‌ای ارز، طلا، سکه و رمزارز از سرویس عمومی tgju.
 * قیمت‌های داخلی به ریال گزارش می‌شوند؛ تبدیل به تومان در لایهٔ نمایش انجام می‌شود.
 */

import { withCache, fetchWithTimeout } from './cache.js';

const ENDPOINT = 'https://call.tgju.org/ajax.json';
const TTL = 4 * 60 * 1000;

function toNumber(raw) {
  const cleaned = String(raw ?? '').replace(/[^\d.\-]/g, '');
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * یک ردیف خام tgju را به شکل یکنواخت درمی‌آورد.
 * `dt` جهت تغییر است: high یعنی صعودی، low یعنی نزولی.
 */
function normalize(id, raw) {
  if (!raw) return null;
  const price = toNumber(raw.p);
  if (price == null) return null;
  const changePercent = Number.isFinite(Number(raw.dp)) ? Number(raw.dp) : 0;
  const direction = raw.dt === 'high' ? 1 : raw.dt === 'low' ? -1 : 0;
  return {
    id,
    price,
    high: toNumber(raw.h),
    low: toNumber(raw.l),
    change: toNumber(raw.d) ?? 0,
    changePercent: direction < 0 ? -Math.abs(changePercent) : Math.abs(changePercent),
    direction,
    updatedAt: raw.ts ?? null,
    updatedLabel: raw.t ?? '',
  };
}

/**
 * نرخ نمادهای خواسته‌شده.
 * @param {string[]} symbols کلیدهای tgju
 */
export async function getMarket(symbols = []) {
  const result = await withCache('market', TTL, async () => {
    const response = await fetchWithTimeout(ENDPOINT, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const raw = await response.json();
    const current = raw?.current;
    if (!current || typeof current !== 'object') {
      throw new Error('ساختار پاسخ سرویس قیمت تغییر کرده است');
    }
    return current;
  });

  const wanted = symbols.length ? symbols : Object.keys(result.data).slice(0, 6);
  const rows = wanted.map((id) => normalize(id, result.data[id])).filter(Boolean);
  const missing = wanted.filter((id) => !rows.some((row) => row.id === id));

  return { rows, missing, at: result.at, stale: Boolean(result.stale), error: result.error ?? null };
}
