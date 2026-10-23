/** کش سادهٔ زمان‌دار روی chrome.storage.local، مشترک بین تب جدید و پاپ‌آپ. */

const PREFIX = 'yar:cache:';

/**
 * مقدار کش‌شده را برمی‌گرداند و می‌گوید کهنه است یا نه.
 * @returns {Promise<{value:any, at:number, stale:boolean}|null>}
 */
export async function readCache(key, maxAgeMs) {
  const storageKey = PREFIX + key;
  const bag = await chrome.storage.local.get(storageKey);
  const entry = bag[storageKey];
  if (!entry || typeof entry.at !== 'number') return null;
  return { value: entry.value, at: entry.at, stale: Date.now() - entry.at > maxAgeMs };
}

export async function writeCache(key, value) {
  await chrome.storage.local.set({ [PREFIX + key]: { value, at: Date.now() } });
  return value;
}

/**
 * الگوی «کهنه را نشان بده، تازه را بیاور».
 * اگر داده تازه باشد همان برمی‌گردد؛ اگر کهنه باشد تلاش برای به‌روزرسانی می‌شود و
 * در صورت شکست، دادهٔ کهنه با نشانهٔ `stale` برمی‌گردد تا رابط کاربری خالی نماند.
 *
 * @param {string} key
 * @param {number} maxAgeMs
 * @param {() => Promise<any>} producer
 */
export async function withCache(key, maxAgeMs, producer) {
  const cached = await readCache(key, maxAgeMs);
  if (cached && !cached.stale) return { data: cached.value, at: cached.at, stale: false };

  try {
    const fresh = await producer();
    await writeCache(key, fresh);
    return { data: fresh, at: Date.now(), stale: false };
  } catch (error) {
    if (cached) return { data: cached.value, at: cached.at, stale: true, error: error.message };
    throw error;
  }
}

/** درخواست شبکه با مهلت زمانی — بدون این، سرویس‌ورکر می‌تواند بی‌پایان منتظر بماند. */
export async function fetchWithTimeout(url, { timeout = 12000, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`پاسخ ${response.status} از سرور`);
    return response;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('زمان پاسخ سرور به پایان رسید');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
