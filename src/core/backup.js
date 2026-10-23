/**
 * پشتیبان‌گیری و بازیابی همهٔ داده‌های کاربر در یک فایل JSON.
 *
 * کش‌ها (نرخ‌ها، آب‌وهوا، اخبار) عمداً در پشتیبان نیستند: کهنه می‌شوند و
 * دوباره ساخته می‌شوند. فقط چیزهایی که کاربر خودش ساخته منتقل می‌شوند.
 */

const PREFIX = 'yar:';
// تاریخچهٔ نرخ‌ها از نو ساخته می‌شود و بزرگ است؛ در پشتیبان جایی ندارد
const EXCLUDED = [/^yar:cache:/, /^yar:timer-note$/, /^yar:market-history$/];
const FORMAT = 'yar-backup';
const MAX_BYTES = 20 * 1024 * 1024;

const isUserKey = (key) => key.startsWith(PREFIX) && !EXCLUDED.some((pattern) => pattern.test(key));

/** محتوای پشتیبان را می‌سازد (جدا از دانلود، تا آزمون‌پذیر باشد). */
export async function collectBackup() {
  const all = await chrome.storage.local.get(null);
  const data = Object.fromEntries(Object.entries(all).filter(([key]) => isUserKey(key)));
  return {
    format: FORMAT,
    version: 1,
    app: chrome.runtime.getManifest?.().version ?? null,
    createdAt: new Date().toISOString(),
    data,
  };
}

/** فایل پشتیبان را برای کاربر دانلود می‌کند. */
export async function exportBackup() {
  const backup = await collectBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = backup.createdAt.slice(0, 10);
  const link = Object.assign(document.createElement('a'), { href: url, download: `yar-backup-${stamp}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * متن فایل پشتیبان را می‌خواند، اعتبارسنجی می‌کند و جایگزین داده‌های فعلی می‌کند.
 * @returns {Promise<number>} تعداد کلیدهای بازیابی‌شده
 * @throws {Error} با پیام فارسیِ قابل نمایش
 */
export async function importBackup(text) {
  if (text.length > MAX_BYTES) throw new Error('فایل پشتیبان بیش از حد بزرگ است.');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('این فایل JSON معتبر نیست.');
  }
  if (parsed?.format !== FORMAT || typeof parsed.data !== 'object' || parsed.data === null) {
    throw new Error('این فایل، پشتیبان یار نیست.');
  }

  const entries = Object.entries(parsed.data).filter(([key]) => isUserKey(key));
  if (!entries.length) throw new Error('فایل پشتیبان خالی است.');

  // کلیدهای کاربری فعلی که در پشتیبان نیستند پاک می‌شوند تا بازیابی «جایگزینی کامل» باشد
  const current = await chrome.storage.local.get(null);
  const stale = Object.keys(current).filter((key) => isUserKey(key) && !(key in parsed.data));
  if (stale.length) await chrome.storage.local.remove(stale);
  await chrome.storage.local.set(Object.fromEntries(entries));
  return entries.length;
}
