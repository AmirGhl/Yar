/**
 * سرویس‌ورکر: تنها مسیر ارتباط با شبکه و APIهای مرورگر.
 * صفحه‌ها هیچ درخواست مستقیمی نمی‌فرستند تا کش و مجوزها یک‌جا مدیریت شود.
 */

import { MESSAGE } from '../core/messaging.js';
import { getWeather, searchCity } from '../services/weather.js';
import { getMarket } from '../services/market.js';
import { getNews } from '../services/news.js';
import { getSuggestions } from '../services/suggest.js';
import { getBingWallpaper, BING_ORIGIN_PATTERN } from '../services/bing.js';
import { watchMarket, HISTORY_KEY } from '../services/market-watch.js';
import { getAirQuality, AIR_ORIGIN_PATTERN } from '../services/air.js';
import { MARKET_SYMBOLS } from '../core/defaults.js';
import { createContextMenus, listenContextMenus } from './context-menus.js';
import { listenOmnibox } from './omnibox.js';
import { syncTimerBadge, watchTimerForBadge, isBadgeAlarm } from './badge.js';
import { runUpdateCheck, scheduleUpdateChecks, isUpdateAlarm, recordUpdate, onUpdateNotificationClick } from './updater.js';

// شنونده‌ها باید در اجرای اول سرویس‌ورکر ثبت شوند، نه داخل یک promise
listenContextMenus();
listenOmnibox();
watchTimerForBadge();

/** همهٔ نمادها یک‌جا: تاریخچه و هشدارها باید نمادهایی را هم بپوشانند که در نوار نیستند. */
const ALL_SYMBOLS = MARKET_SYMBOLS.map((item) => item.id);

/**
 * صف ثبت: چند صفحه ممکن است هم‌زمان نرخ بخواهند؛ اگر ثبت‌ها موازی بخوانند و
 * بنویسند، یک هشدار می‌تواند دو بار اعلان بفرستد. پس پشت سر هم اجرا می‌شوند.
 */
let watchQueue = Promise.resolve();

/** نرخ‌ها + ثبت تاریخچه و سنجش هشدار؛ شکست مرحلهٔ دوم پاسخ را خراب نمی‌کند. */
async function marketWithWatch(symbols) {
  const result = await getMarket(symbols);
  // دادهٔ کهنهٔ کش (سرویس پاسخ نداده) نمونهٔ تازه نیست و نباید هشدار بزند
  if (!result.stale) watchQueue = watchQueue.then(() => watchMarket(result.rows)).catch(() => {});
  return result;
}

/** هر پیام به یک تابع نگاشت می‌شود؛ افزودن قابلیت یعنی افزودن یک ردیف. */
const handlers = {
  [MESSAGE.weather]: (payload) => getWeather(payload),
  [MESSAGE.air]: async (payload) => {
    const granted = await chrome.permissions.contains({ origins: [AIR_ORIGIN_PATTERN] });
    if (!granted) throw new Error('اجازهٔ دسترسی به سرویس کیفیت هوا داده نشده است');
    return getAirQuality(payload);
  },
  [MESSAGE.geocode]: (payload) => searchCity(payload.query ?? ''),
  [MESSAGE.market]: (payload) => marketWithWatch(payload.symbols ?? []),
  [MESSAGE.marketHistory]: async (payload) => {
    const { [HISTORY_KEY]: history = {} } = await chrome.storage.local.get(HISTORY_KEY);
    const ids = [].concat(payload.symbols ?? []);
    return Object.fromEntries(ids.map((id) => [id, history[id] ?? []]));
  },
  [MESSAGE.news]: (payload) => getNews(payload.feeds ?? [], payload.limit ?? 8),
  [MESSAGE.suggest]: (payload) => getSuggestions(payload.query ?? ''),
  [MESSAGE.topSites]: async () => (chrome.topSites ? chrome.topSites.get() : []),
  [MESSAGE.bookmarks]: async (payload) => {
    const nodes = payload.folderId
      ? await chrome.bookmarks.getChildren(payload.folderId)
      : (await chrome.bookmarks.getTree())[0].children ?? [];
    return nodes.map(({ id, title, url, dateAdded }) => ({
      id,
      title,
      url: url ?? null,
      isFolder: !url,
      dateAdded: dateAdded ?? null,
    }));
  },
  [MESSAGE.bookmarksSearch]: async (payload) => {
    const query = String(payload.query ?? '').trim();
    if (query.length < 2) return [];
    const nodes = await chrome.bookmarks.search(query);
    return nodes
      .filter((node) => node.url)
      .slice(0, payload.limit ?? 6)
      .map(({ id, title, url }) => ({ id, title: title || url, url }));
  },
  [MESSAGE.timerSchedule]: async (payload) => scheduleTimer(payload),
  [MESSAGE.updateCheck]: async () => runUpdateCheck({ force: true }),
  [MESSAGE.bing]: async () => {
    // بدون مجوز دامنه، درخواست شکست می‌خورد؛ پیام روشن بهتر از خطای شبکهٔ مبهم است
    const granted = await chrome.permissions.contains({ origins: [BING_ORIGIN_PATTERN] });
    if (!granted) throw new Error('اجازهٔ دسترسی به bing.com داده نشده است');
    return getBingWallpaper();
  },
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = handlers[message?.type];
  if (!handler) {
    sendResponse({ ok: false, error: `پیام ناشناخته: ${message?.type}` });
    return false;
  }
  handler(message.payload ?? {})
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error?.message ?? 'خطای نامشخص' }));
  return true; // پاسخ ناهمگام
});

// ---------- پایان تایمر تمرکز ----------
// زنگ در سرویس‌ورکر می‌ماند تا حتی اگر همهٔ تب‌ها بسته باشند، اعلان برسد.
const TIMER_ALARM = 'yar:timer-end';
const TIMER_NOTE_KEY = 'yar:timer-note';

async function scheduleTimer({ endsAt = null, label = '', next = '' }) {
  await chrome.alarms.clear(TIMER_ALARM);
  if (!endsAt || endsAt <= Date.now()) {
    await chrome.storage.local.remove(TIMER_NOTE_KEY);
    return { scheduled: false };
  }
  await chrome.storage.local.set({ [TIMER_NOTE_KEY]: { label, next } });
  await chrome.alarms.create(TIMER_ALARM, { when: endsAt });
  return { scheduled: true };
}

async function announceTimerEnd() {
  const { [TIMER_NOTE_KEY]: note, 'yar:settings': settings } = await chrome.storage.local.get([TIMER_NOTE_KEY, 'yar:settings']);
  await chrome.storage.local.remove(TIMER_NOTE_KEY);
  if (!settings?.timer?.notify || !chrome.notifications) return;
  const granted = await chrome.permissions.contains({ permissions: ['notifications'] });
  if (!granted) return;
  chrome.notifications.create(TIMER_ALARM, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('src/assets/icons/icon-128.png'),
    title: `${note?.label ?? 'تایمر'} تمام شد`,
    message: note?.next ? `نوبت ${note.next} است.` : 'زمان به پایان رسید.',
    priority: 2,
  });
}

// کلیک روی اعلان فقط آن را می‌بندد؛ تب جدید را خود کاربر باز می‌کند
chrome.notifications?.onClicked.addListener(async (id) => {
  if (await onUpdateNotificationClick(id)) return;
  chrome.notifications.clear(id);
});

// گرم نگه داشتن کش قیمت و آب‌وهوا تا تب جدید فوراً داده داشته باشد.
const REFRESH_ALARM = 'yar:refresh';

chrome.runtime.onInstalled.addListener((details) => {
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: 10 });
  scheduleUpdateChecks().catch(() => {});
  if (details?.reason === 'update') recordUpdate(details.previousVersion).catch(() => {});
  createContextMenus().catch(() => {});
  syncTimerBadge().catch(() => {});
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: 10 });
  scheduleUpdateChecks().catch(() => {});
  syncTimerBadge().catch(() => {});
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === TIMER_ALARM) {
    await announceTimerEnd();
    await syncTimerBadge();
    return;
  }
  if (isBadgeAlarm(alarm.name)) {
    await syncTimerBadge();
    return;
  }
  if (isUpdateAlarm(alarm.name)) {
    await runUpdateCheck();
    return;
  }
  if (alarm.name !== REFRESH_ALARM) return;
  const { 'yar:settings': settings } = await chrome.storage.local.get('yar:settings');
  const city = settings?.weather?.city;
  await Promise.allSettled([
    marketWithWatch(ALL_SYMBOLS),
    city ? getWeather({ ...city, timeZone: city.timeZone, unit: settings?.weather?.unit }) : Promise.resolve(),
  ]);
});
