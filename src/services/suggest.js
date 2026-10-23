/** پیشنهاد جست‌وجو از سرویس عمومی تکمیل خودکار گوگل. */

import { fetchWithTimeout } from './cache.js';

const ENDPOINT = 'https://suggestqueries.google.com/complete/search';

/**
 * @param {string} query
 * @returns {Promise<string[]>} حداکثر ۸ پیشنهاد
 */
export async function getSuggestions(query) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(ENDPOINT);
  url.searchParams.set('client', 'chrome');
  url.searchParams.set('hl', 'fa');
  url.searchParams.set('q', trimmed);

  const response = await fetchWithTimeout(url.toString(), { timeout: 5000 });
  const payload = await response.json();
  const list = Array.isArray(payload) && Array.isArray(payload[1]) ? payload[1] : [];
  return list.filter((item) => typeof item === 'string').slice(0, 8);
}
