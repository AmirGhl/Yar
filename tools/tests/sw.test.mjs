/**
 * آزمون یکپارچهٔ سرویس‌ورکر — بدون مرورگر و بدون شبکه.
 *
 * chrome.* و fetch شبیه‌سازی می‌شوند؛ سرویس‌ورکر واقعی بار می‌شود و از راه همان
 * پیام‌ها، نوار آدرس و منوی راست‌کلیک صدا زده می‌شود که در کروم.
 */
import { check, summary } from './assert.mjs';

// ---------- شبیه‌ساز ----------
const store = new Map();
const listeners = {};
const notifications = [];
const badge = { text: '', color: null };
const alarms = new Map();
const opened = [];
let menus = [];
let notificationsGranted = true;

const event = (name) => ({ addListener: (fn) => (listeners[name] = fn) });
const clone = (value) => (value === undefined ? undefined : structuredClone(value));

globalThis.chrome = {
  runtime: { onMessage: event('message'), onInstalled: event('installed'), onStartup: event('startup'), getURL: (p) => `ext://${p}` },
  alarms: {
    create: async (name, info) => alarms.set(name, info),
    clear: async (name) => alarms.delete(name),
    get: async (name) => alarms.get(name),
    onAlarm: event('alarm'),
  },
  storage: {
    local: {
      get: async (keys) => {
        const list = keys == null ? [...store.keys()] : [].concat(keys);
        return Object.fromEntries(list.filter((key) => store.has(key)).map((key) => [key, clone(store.get(key))]));
      },
      set: async (items) => {
        const changes = {};
        for (const [key, value] of Object.entries(items)) {
          changes[key] = { oldValue: clone(store.get(key)), newValue: clone(value) };
          store.set(key, clone(value));
        }
        listeners.storage?.(changes, 'local');
      },
      remove: async (keys) => [].concat(keys).forEach((key) => store.delete(key)),
    },
    onChanged: event('storage'),
  },
  permissions: { contains: async ({ permissions = [] }) => (permissions.includes('notifications') ? notificationsGranted : true) },
  notifications: { create: (id, options) => notifications.push(options), onClicked: event('notificationClick'), clear: () => {} },
  bookmarks: {
    search: async () => [{ id: '1', title: 'MDN', url: 'https://developer.mozilla.org' }, { id: '2', title: 'پوشه' }],
  },
  action: {
    setBadgeText: async ({ text }) => (badge.text = text),
    setBadgeBackgroundColor: async ({ color }) => (badge.color = color),
  },
  contextMenus: {
    removeAll: async () => (menus = []),
    create: (menu) => menus.push(menu),
    onClicked: event('menu'),
  },
  omnibox: { setDefaultSuggestion: (s) => (listeners.defaultSuggestion = s), onInputChanged: event('omniChanged'), onInputEntered: event('omniEntered') },
  tabs: { update: async (o) => opened.push(['update', o.url]), create: async (o) => opened.push(['create', o.url]) },
};

// پاسخ ساختگی tgju: نقره ۴٬۹۴۳٬۹۰۰ ریال، دلار ۲٬۷۱۹٬۰۵۰ ریال
let silverRial = '4,943,900';
globalThis.fetch = async (url) => {
  if (String(url).includes('tgju')) {
    return {
      ok: true,
      json: async () => ({
        current: {
          silver_999: { p: silverRial, h: '5,180,000', l: '4,936,200', d: '0', dp: 1.2, dt: 'high' },
          price_dollar_rl: { p: '2,719,050', dp: 0, dt: '' },
        },
      }),
    };
  }
  throw new Error(`unexpected fetch ${url}`);
};

await import('../../src/background/service-worker.js');
const send = (type, payload = {}) => new Promise((resolve) => listeners.message({ type, payload }, {}, resolve));
const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

// ---------- پیام‌ها ----------
const unknown = await send('nope');
check(unknown.ok === false && unknown.error.includes('nope'), 'unknown message → error response');

const marks = await send('bookmarks:search', { query: 'md' });
check(marks.ok && marks.data.length === 1 && marks.data[0].url.includes('mozilla'), 'bookmark search drops folders');

const bing = await send('wallpaper:bing');
check(bing.ok === true || bing.ok === false, 'bing handler responds');

// ---------- هشدار قیمت ----------
store.set('yar:alerts', [{ id: 'a1', symbolId: 'silver_999', direction: 'above', target: 4_000_000, active: true, createdAt: 1 }]);
const [m1, m2] = await Promise.all([send('market:get', { symbols: ['silver_999'] }), send('market:get', { symbols: ['silver_999', 'price_dollar_rl'] })]);
await settle();
check(m1.ok && m2.ok && m1.data.rows[0].price === 4_943_900, 'market rows parsed');
check(notifications.length === 1 && notifications[0].message.includes('۴۹۴,۳۹۰'), `alert fired once with toman price (${notifications.length})`);
check(store.get('yar:alerts')[0].active === false, 'fired alert disarmed');
check(Object.keys(store.get('yar:market-history')).includes('silver_999'), 'history recorded');
const history = await send('market:history', { symbols: ['silver_999', 'nothing'] });
check(history.data.silver_999.length === 1 && history.data.nothing.length === 0, 'history endpoint');

// ---------- نوار آدرس ----------
const { interpret, escapeXml } = await import('../../src/background/omnibox.js');
check((await interpret('۲۵×۴')).description.includes('۱۰۰'), 'omnibox calc');
check((await interpret('کار خرید نان')).kind === 'todo', 'omnibox todo prefix');
check((await interpret('note سلام')).kind === 'note', 'omnibox note prefix');
const yt = await interpret('!y گربه');
check(yt.kind === 'search' && yt.url.startsWith('https://www.youtube.com/') && yt.url.includes(encodeURIComponent('گربه')), 'omnibox bang search');
check(escapeXml('<a & "b">') === '&lt;a &amp; &quot;b&quot;&gt;', 'omnibox escapes XML');

listeners.omniEntered('کار تماس با علی', 'currentTab');
await settle();
check(store.get('yar:todos')?.at(-1)?.text === 'تماس با علی', 'omnibox Enter adds todo');
check(badge.text === '✓', 'badge flashes ✓ after background add');
listeners.omniEntered('حافظ', 'newForegroundTab');
await settle();
check(opened.at(-1)?.[0] === 'create' && opened.at(-1)[1].includes(encodeURIComponent('حافظ')), 'omnibox Enter searches in new tab');

// ---------- منوی راست‌کلیک ----------
listeners.installed();
await settle();
check(menus.length === 4 && menus.some((menu) => menu.contexts.includes('selection')), 'context menus created on install');
listeners.menu({ menuItemId: 'yar:selection-note', selectionText: 'متن جالب', pageUrl: 'https://example.com/a' });
await settle();
const notes = store.get('yar:notes');
check(notes.version === 2 && notes.notes[0].text.startsWith('متن جالب') && notes.notes[0].text.includes('example.com'), 'selection → note with source');
listeners.menu({ menuItemId: 'yar:link-shortcut', linkUrl: 'https://ganjoor.net/' });
listeners.menu({ menuItemId: 'yar:link-shortcut', linkUrl: 'https://ganjoor.net/' });
listeners.menu({ menuItemId: 'yar:link-shortcut', linkUrl: 'javascript:alert(1)' });
await settle();
const custom = store.get('yar:shortcuts').custom;
check(custom.length === 1 && custom[0].title === 'ganjoor.net', 'link → shortcut, deduped, javascript: rejected');

// ---------- نشان تایمر ----------
await new Promise((resolve) => setTimeout(resolve, 1900)); // پایان فلش ✓
await chrome.storage.local.set({ 'yar:timer': { mode: 'focus', endsAt: Date.now() + 24.2 * 60000, remaining: 1500 } });
await settle();
check(badge.text === '25′' && alarms.has('yar:badge-tick'), `running timer shows minutes on badge (${badge.text})`);
await chrome.storage.local.set({ 'yar:timer': { mode: 'focus', endsAt: null, remaining: 900 } });
await settle();
check(badge.text === '' && !alarms.has('yar:badge-tick'), 'paused timer clears badge and tick alarm');

summary('service-worker');
