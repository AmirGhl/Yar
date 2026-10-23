/**
 * آزمون به‌روزرسانی: مقایسهٔ نسخه، خواندن مخزن و متن تغییرات، و چرخهٔ کامل
 * بررسی در سرویس‌ورکر (Release، نبود Release، خطا، اعلان یک‌باره، ثبت «به‌روز شد»).
 * گیت‌هاب با fetch ساختگی شبیه‌سازی می‌شود — بدون شبکه.
 */
import { check, summary } from './assert.mjs';
import { compareVersions, isNewer, parseVersion, parseRepo, parseReleaseNotes, shouldAnnounce } from '../../src/lib/versions.js';

// ---------- نسخه ----------
check(JSON.stringify(parseVersion('v1.7.0')) === '[1,7,0]' && JSON.stringify(parseVersion('۱٫۷')) === '[1,7]', 'parse v-prefix and Persian digits');
check(parseVersion('1.7.0-beta.2')?.join('.') === '1.7.0' && parseVersion('latest') === null, 'pre-release suffix / junk');
check(compareVersions('1.10.0', '1.9.9') === 1, '1.10 > 1.9 (numeric, not string)');
check(compareVersions('1.7', '1.7.0') === 0 && compareVersions('1.7.0.1', '1.7.0') === 1, 'missing parts are zero');
check(isNewer('v1.7.0', '1.6.0') && !isNewer('1.6.0', '1.6.0') && !isNewer('junk', '1.0'), 'isNewer');

// ---------- مخزن ----------
check(parseRepo('owner/yar') === 'owner/yar', 'owner/repo');
check(parseRepo('https://github.com/owner/yar.git') === 'owner/yar' && parseRepo('github.com/owner/yar/') === 'owner/yar', 'full URLs');
check(parseRepo('https://evil.com/owner/yar') === null && parseRepo('a/b/c') === null && parseRepo('../x') === null && parseRepo('') === null, 'rejects bad input');

// ---------- متن تغییرات ----------
const notes = parseReleaseNotes('## تازه‌ها\n- **پررنگ** و [پیوند](https://x.y)\n<script>alert(1)</script>\n\nمتن ساده\n![img](a.png)');
check(notes[0].kind === 'heading' && notes[0].text === 'تازه‌ها', 'heading');
check(notes[1].kind === 'item' && notes[1].text === 'پررنگ و پیوند', 'markdown stripped to text');
check(!notes.some((line) => line.text.includes('<') || line.text.includes('alert')), 'HTML tags and script content removed');
check(notes.at(-1).text === 'متن ساده' && notes.length === 3, 'images and script lines dropped, empty lines skipped');

// ---------- اعلان داخل صفحه ----------
const available = { status: 'available', latest: { version: '1.8.0' } };
check(shouldAnnounce(available, { current: '1.7.0' }), 'announce newer');
check(!shouldAnnounce({ ...available, dismissedVersion: '1.8.0' }, { current: '1.7.0' }), 'dismissed version is quiet');
check(!shouldAnnounce({ ...available, snoozedUntil: Date.now() + 1000 }, { current: '1.7.0' }), 'snoozed is quiet');
check(shouldAnnounce({ ...available, snoozedUntil: Date.now() - 1000 }, { current: '1.7.0' }), 'snooze expires');
check(!shouldAnnounce(available, { current: '1.8.0' }), 'already installed → quiet');

// ---------- چرخهٔ سرویس‌ورکر ----------
const store = new Map();
const notifications = [];
const opened = [];
let version = '1.7.0';
const ev = () => ({ addListener() {} });
globalThis.chrome = {
  runtime: { getManifest: () => ({ version }), getURL: (p) => p },
  storage: {
    local: {
      get: async (keys) => Object.fromEntries([].concat(keys).filter((k) => store.has(k)).map((k) => [k, structuredClone(store.get(k))])),
      set: async (items) => Object.entries(items).forEach(([k, v]) => store.set(k, structuredClone(v))),
    },
  },
  alarms: { get: async () => null, create: async () => {} },
  permissions: { contains: async () => true },
  notifications: { create: (id, o) => notifications.push(o), clear: () => {}, onClicked: ev() },
  tabs: { create: async (o) => opened.push(o.url) },
};

let mode = 'release';
globalThis.fetch = async (url) => {
  const u = String(url);
  if (mode === 'offline') throw new TypeError('Failed to fetch');
  if (u.includes('/releases/latest')) {
    if (mode === 'no-release') return { ok: false, status: 404, json: async () => ({}) };
    if (mode === 'rate') return { ok: false, status: 403, json: async () => ({}) };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        tag_name: 'v1.8.0',
        name: 'یار 1.8.0',
        body: '- چیز تازه',
        html_url: 'https://github.com/o/yar/releases/tag/v1.8.0',
        published_at: '2026-10-20T10:00:00Z',
        assets: [{ name: 'source.tar.gz', browser_download_url: 'x' }, { name: 'yar-1.8.0.zip', browser_download_url: 'https://dl/yar-1.8.0.zip' }],
        zipball_url: 'https://api/zipball',
      }),
    };
  }
  if (u.includes('raw.githubusercontent.com')) return { ok: true, status: 200, json: async () => ({ version: '1.7.5' }) };
  throw new Error(`unexpected ${u}`);
};

const { runUpdateCheck, recordUpdate, onUpdateNotificationClick, UPDATED_KEY } = await import('../../src/background/updater.js');
const { UPDATE_KEY } = await import('../../src/services/updates.js');

let state = await runUpdateCheck({ force: true });
check(state.repo === 'AmirGhl/Yar' && state.status === 'available', 'no saved repo → official repo is checked');

store.set('yar:settings', { update: { repo: 'https://github.com/o/yar', auto: true, notify: true } });
state = await runUpdateCheck({ force: true });
check(state.status === 'available' && state.latest.version === '1.8.0' && state.repo === 'o/yar', 'release found');
check(state.latest.downloadUrl === 'https://dl/yar-1.8.0.zip', 'prefers the yar zip asset');
check(notifications.length === 1 && notifications[0].title.includes('1.8.0'), 'desktop notification once');
await runUpdateCheck({ force: true });
check(notifications.length === 1, 'same version is not notified twice');

const auto = await runUpdateCheck();
check(auto.checkedAt === store.get(UPDATE_KEY).checkedAt, 'auto check respects the 3h gap');

mode = 'rate';
state = await runUpdateCheck({ force: true });
check(state.status === 'available' && state.error.includes('محدودیت'), 'rate limit keeps last good result + error');

mode = 'offline';
state = await runUpdateCheck({ force: true });
check(state.error.includes('اتصال'), `offline → readable error (${state.error})`);

mode = 'no-release';
store.delete(UPDATE_KEY);
state = await runUpdateCheck({ force: true });
check(state.status === 'available' && state.latest.version === '1.7.5' && state.latest.source === 'manifest', 'falls back to manifest.json without releases');

mode = 'release';
await runUpdateCheck({ force: true });
check(await onUpdateNotificationClick('yar:update'), 'notification click handled');
check(opened.at(-1)?.includes('/releases/tag/v1.8.0'), 'opens the release page');
check(!(await onUpdateNotificationClick('other')), 'other notifications ignored');

// نصب نسخهٔ تازه → «به‌روز شد»
version = '1.8.0';
await recordUpdate('1.7.0');
check(store.get(UPDATED_KEY)?.from === '1.7.0' && store.get(UPDATED_KEY).to === '1.8.0' && !store.get(UPDATED_KEY).seen, 'records from → to');
check(store.get(UPDATE_KEY).status === 'latest', 'stale "available" cleared after installing it');
store.delete(UPDATED_KEY);
await recordUpdate('1.9.0');
check(!store.has(UPDATED_KEY), 'downgrade is not an update');

summary('updates');
