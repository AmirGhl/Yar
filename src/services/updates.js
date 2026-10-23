/**
 * بررسی نسخهٔ تازه روی گیت‌هاب.
 *
 * اول «آخرین انتشار» (Releases) خوانده می‌شود: شمارهٔ نسخه، متن تغییرات و فایل zip.
 * اگر مخزن هنوز انتشاری نداشت، manifest.json شاخهٔ اصلی خوانده می‌شود. هر دو نشانی
 * Access-Control-Allow-Origin: * دارند، پس هیچ مجوز دامنه‌ای لازم نیست.
 *
 * افزونهٔ نصب‌شده نمی‌تواند فایل‌های خودش را عوض کند (محدودیت امنیتی کروم)؛ کار ما
 * پیدا کردن، خبر دادن و آماده کردن دانلود است. نصب از فروشگاه کروم خودکار به‌روز می‌شود.
 */

import { fetchWithTimeout } from './cache.js';
import { isNewer, parseRepo, parseVersion } from '../lib/versions.js';

export const UPDATE_KEY = 'yar:update';
const API = 'https://api.github.com/repos';
const RAW = 'https://raw.githubusercontent.com';

/** فایل zip انتشار: اول فایلی که نامش «yar» دارد، بعد هر zip، و در آخر zip خودکار کد. */
function pickDownload(release) {
  const zips = (release.assets ?? []).filter((asset) => /\.zip$/i.test(asset.name ?? ''));
  const preferred = zips.find((asset) => /yar/i.test(asset.name)) ?? zips[0];
  return preferred?.browser_download_url ?? release.zipball_url ?? null;
}

async function fromRelease(repo) {
  const response = await fetch(`${API}/${repo}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store',
    // وضعیت 404/403 را خودمان می‌خوانیم، پس fetchWithTimeout (که روی هر خطا پرتاب می‌کند) به کار نمی‌آید
    signal: AbortSignal.timeout(12000),
  });
  if (response.status === 404) return null; // مخزن هست ولی انتشاری ندارد (یا مخزن نیست)
  if (response.status === 403) throw new Error('محدودیت درخواست گیت‌هاب — کمی بعد دوباره امتحان کنید');
  if (!response.ok) throw new Error(`پاسخ ${response.status} از گیت‌هاب`);
  const release = await response.json();
  if (!parseVersion(release.tag_name)) throw new Error(`برچسب انتشار «${release.tag_name}» شمارهٔ نسخه نیست`);
  return {
    version: String(release.tag_name).replace(/^v/i, ''),
    name: release.name || release.tag_name,
    notes: String(release.body ?? '').slice(0, 8000),
    url: release.html_url,
    downloadUrl: pickDownload(release),
    publishedAt: release.published_at ? Date.parse(release.published_at) : null,
    source: 'release',
  };
}

async function fromManifest(repo) {
  const response = await fetchWithTimeout(`${RAW}/${repo}/HEAD/manifest.json`, { cache: 'no-store' });
  const manifest = await response.json();
  if (!parseVersion(manifest.version)) throw new Error('manifest.json مخزن شمارهٔ نسخهٔ معتبر ندارد');
  return {
    version: manifest.version,
    name: `نسخهٔ ${manifest.version}`,
    notes: '',
    url: `https://github.com/${repo}`,
    downloadUrl: `https://github.com/${repo}/archive/refs/heads/HEAD.zip`,
    publishedAt: null,
    source: 'manifest',
  };
}

/**
 * @param {{repo:string, current:string}} options
 * @returns {Promise<{status:'available'|'latest', current:string, checkedAt:number, repo:string,
 *          latest:{version:string, name:string, notes:string, url:string, downloadUrl:string|null,
 *          publishedAt:number|null, source:'release'|'manifest'}}>}
 * @throws {Error} با پیام فارسی
 */
export async function checkForUpdate({ repo: input, current }) {
  const repo = parseRepo(input);
  if (!repo) throw new Error('نشانی مخزن گیت‌هاب تنظیم نشده است');
  let latest;
  try {
    latest = (await fromRelease(repo)) ?? (await fromManifest(repo));
  } catch (error) {
    if (error.name === 'TimeoutError') throw new Error('گیت‌هاب پاسخ نداد (زمان تمام شد)', { cause: error });
    if (error.name === 'TypeError') throw new Error('اتصال به گیت‌هاب برقرار نشد', { cause: error });
    if (/404/.test(error.message)) throw new Error(`مخزن «${repo}» پیدا نشد یا خصوصی است`, { cause: error });
    throw error;
  }
  return {
    status: isNewer(latest.version, current) ? 'available' : 'latest',
    current,
    repo,
    checkedAt: Date.now(),
    latest,
  };
}
