/**
 * لایهٔ دسترسی به chrome.storage.
 * مسئولیت: خواندن/نوشتن تنظیمات و داده‌های کاربر + آگاه‌سازی مشترکین از تغییر.
 */

import { cloneDefaults, OFFICIAL_REPO } from './defaults.js';

const SETTINGS_KEY = 'yar:settings';
const area = chrome.storage.local;

/** ادغام عمیق: مقادیر ذخیره‌شده روی پیش‌فرض‌ها می‌نشینند. */
function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch ?? base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const current = out[key];
    out[key] =
      current && typeof current === 'object' && !Array.isArray(current) && value && typeof value === 'object' && !Array.isArray(value)
        ? deepMerge(current, value)
        : value;
  }
  return out;
}

let cache = null;

/**
 * مهاجرت‌های یک‌باره روی تنظیمات ذخیره‌شده — هر کدام فقط اگر نسخه قدیمی‌تر باشد.
 * تنظیمات پیش‌فرض نیازی ندارند؛ این فقط برای کاربرانی است که قبلاً چیزی ذخیره کرده‌اند.
 */
const MIGRATIONS = [
  {
    version: 2,
    // نقرهٔ داخلی (هر گرم) به نوار نرخ‌های کاربران قبلی هم اضافه می‌شود، کنار طلا
    run(stored) {
      const symbols = stored.market?.symbols;
      if (!Array.isArray(symbols) || symbols.includes('silver_999')) return stored;
      const next = [...symbols];
      // بعد از *آخرین* نماد طلا و سکه، تا گروه طلا وسطش نشکند
      const GOLD = ['sekee', 'sekeb', 'nim', 'rob', 'gerami', 'geram18', 'geram24', 'mesghal'];
      const afterGold = next.findLastIndex((id) => GOLD.includes(id));
      next.splice(afterGold >= 0 ? afterGold + 1 : next.length, 0, 'silver_999');
      return { ...stored, market: { ...stored.market, symbols: next } };
    },
  },
  {
    version: 3,
    // نصب‌هایی که پیش از داشتن مخزن رسمی، «مخزن خالی» ذخیره کرده بودند، مخزن رسمی را بگیرند.
    // مخزنی که کاربر خودش نوشته دست نمی‌خورد.
    run(stored) {
      if (stored.update?.repo) return stored;
      return { ...stored, update: { ...stored.update, repo: OFFICIAL_REPO } };
    },
  },
];

/** @returns {{settings:object, changed:boolean}} */
export function migrateSettings(stored) {
  let settings = stored;
  let changed = false;
  for (const migration of MIGRATIONS) {
    if ((settings.version ?? 1) >= migration.version) continue;
    settings = { ...migration.run(settings), version: migration.version };
    changed = true;
  }
  return { settings, changed };
}

/** تنظیمات کامل (پیش‌فرض‌ها + تغییرات کاربر). */
export async function getSettings({ fresh = false } = {}) {
  if (cache && !fresh) return cache;
  const stored = await area.get(SETTINGS_KEY);
  const raw = stored[SETTINGS_KEY];
  if (raw) {
    const { settings: migrated, changed } = migrateSettings(raw);
    if (changed) await area.set({ [SETTINGS_KEY]: migrated });
    cache = deepMerge(cloneDefaults(), migrated);
  } else {
    cache = cloneDefaults();
  }
  return cache;
}

/**
 * تغییر بخشی از تنظیمات. patch می‌تواند شیء جزئی یا تابعِ (settings) => patch باشد.
 * @returns {Promise<object>} تنظیمات به‌روزشده
 */
export async function updateSettings(patch) {
  const current = await getSettings();
  const delta = typeof patch === 'function' ? patch(structuredClone(current)) : patch;
  cache = deepMerge(current, delta);
  await area.set({ [SETTINGS_KEY]: cache });
  return cache;
}

/** بازگرداندن همه‌چیز به حالت اولیه. */
export async function resetSettings() {
  cache = cloneDefaults();
  await area.remove(SETTINGS_KEY);
  return cache;
}

/** خواندن یک کلید داده‌ای (کارها، یادداشت‌ها، کش‌ها). */
export async function readData(key, fallback = null) {
  const result = await area.get(key);
  return key in result ? result[key] : fallback;
}

/** نوشتن یک کلید داده‌ای. */
export async function writeData(key, value) {
  await area.set({ [key]: value });
  return value;
}

export async function removeData(key) {
  await area.remove(key);
}

/**
 * اشتراک در تغییر تنظیمات (مثلاً وقتی پاپ‌آپ چیزی را عوض می‌کند و تب جدید باز است).
 * @param {(settings:object) => void} listener
 * @returns {() => void} تابع لغو اشتراک
 */
export function onSettingsChanged(listener) {
  const handler = (changes, areaName) => {
    if (areaName !== 'local' || !changes[SETTINGS_KEY]) return;
    cache = deepMerge(cloneDefaults(), changes[SETTINGS_KEY].newValue ?? {});
    listener(cache);
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

/**
 * اشتراک در تغییر یک کلید داده‌ای مشخص.
 * @returns {() => void} تابع لغو اشتراک
 */
export function onDataChanged(key, listener) {
  const handler = (changes, areaName) => {
    if (areaName !== 'local' || !changes[key]) return;
    listener(changes[key].newValue);
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

export const STORAGE_KEYS = {
  settings: SETTINGS_KEY,
  todos: 'yar:todos',
  notes: 'yar:notes',
  shortcuts: 'yar:shortcuts',
  timer: 'yar:timer',
  /** رویدادهای شخصی تقویم: { 'jy-mm-dd': [{id, text}] } */
  events: 'yar:events',
  searchHistory: 'yar:search-history',
  /** هشدارهای قیمت — سرویس‌ورکر هم مستقیم همین کلید را می‌خواند */
  alerts: 'yar:alerts',
  /** سبد دارایی: [{id, symbolId, amount, buyPrice?}] */
  portfolio: 'yar:portfolio',
  marketHistory: 'yar:market-history',
  cache: (name) => `yar:cache:${name}`,
};
