/**
 * به‌روزرسانی در پس‌زمینه: هر ۶ ساعت گیت‌هاب را می‌سنجد، نتیجه را در yar:update
 * می‌گذارد (صفحه‌ها از همان‌جا می‌خوانند و توست/پنجره نشان می‌دهند) و برای هر نسخهٔ
 * تازه فقط یک بار اعلان دسکتاپ می‌فرستد.
 *
 * بعد از نصب نسخهٔ تازه، «از چه نسخه‌ای به چه نسخه‌ای» ثبت می‌شود تا تب جدید
 * پیام «به‌روز شد — تازه‌ها» نشان دهد.
 */

import { checkForUpdate, UPDATE_KEY } from '../services/updates.js';
import { compareVersions } from '../lib/versions.js';
import { OFFICIAL_REPO } from '../core/defaults.js';

const CHECK_ALARM = 'yar:update-check';
const NOTIFICATION_ID = 'yar:update';
export const UPDATED_KEY = 'yar:updated-from';
const CHECK_EVERY_MINUTES = 6 * 60;
// بررسی خودکار زودتر از این تکرار نمی‌شود (سقف ۶۰ درخواست در ساعت گیت‌هاب بی‌کلید)
const MIN_AUTO_GAP_MS = 3 * 60 * 60 * 1000;

const currentVersion = () => chrome.runtime.getManifest().version;

async function readState() {
  const { [UPDATE_KEY]: state = {}, 'yar:settings': settings = {} } = await chrome.storage.local.get([UPDATE_KEY, 'yar:settings']);
  // سرویس‌ورکر تنظیمات را بی‌واسطه می‌خواند (بی پیش‌فرض‌ها)؛ مخزن خالی یعنی «هنوز تنظیم نشده» → رسمی
  const prefs = { repo: OFFICIAL_REPO, auto: true, notify: true, ...settings.update };
  if (!prefs.repo) prefs.repo = OFFICIAL_REPO;
  return { state, prefs };
}

async function notify(result) {
  if (!chrome.notifications) return false;
  const granted = await chrome.permissions.contains({ permissions: ['notifications'] });
  if (!granted) return false;
  chrome.notifications.create(NOTIFICATION_ID, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('src/assets/icons/icon-128.png'),
    title: `نسخهٔ تازهٔ یار: ${result.latest.version}`,
    message: `نسخهٔ نصب‌شده ${result.current} است. برای دیدن تغییرات و دریافت، کلیک کنید.`,
    priority: 1,
  });
  return true;
}

/**
 * @param {{force?:boolean}} options `force` = کاربر خودش «بررسی کن» را زده
 * @returns {Promise<object>} وضعیت ذخیره‌شده
 */
export async function runUpdateCheck({ force = false } = {}) {
  const { state, prefs } = await readState();
  const current = currentVersion();

  if (!force && (!prefs.auto || Date.now() - (state.checkedAt ?? 0) < MIN_AUTO_GAP_MS)) return state;

  let next;
  try {
    const result = await checkForUpdate({ repo: prefs.repo, current });
    next = {
      ...result,
      error: null,
      // این دو بین بررسی‌ها حفظ می‌شوند تا یک نسخه دو بار خبر داده نشود
      notifiedVersion: state.notifiedVersion ?? null,
      dismissedVersion: state.dismissedVersion ?? null,
    };
    if (result.status === 'available' && prefs.notify && next.notifiedVersion !== result.latest.version) {
      if (await notify(result)) next.notifiedVersion = result.latest.version;
    }
  } catch (error) {
    // خطا آخرین نتیجهٔ خوب را پاک نمی‌کند؛ فقط کنارش ثبت می‌شود
    next = { ...state, current, status: state.latest && compareVersions(state.latest.version, current) > 0 ? 'available' : 'error', error: error.message, checkedAt: Date.now() };
  }
  await chrome.storage.local.set({ [UPDATE_KEY]: next });
  return next;
}

/** زنگ دوره‌ای؛ اولین بررسی یک دقیقه بعد از روشن شدن مرورگر، نه درست سر راه‌اندازی. */
export async function scheduleUpdateChecks() {
  const existing = await chrome.alarms.get(CHECK_ALARM);
  if (!existing) await chrome.alarms.create(CHECK_ALARM, { delayInMinutes: 1, periodInMinutes: CHECK_EVERY_MINUTES });
}

export const isUpdateAlarm = (name) => name === CHECK_ALARM;

/** بعد از نصب نسخهٔ تازه: نسخهٔ قبلی ثبت می‌شود و وضعیت «در دسترس» کهنه پاک می‌شود. */
export async function recordUpdate(previousVersion) {
  const current = currentVersion();
  if (!previousVersion || compareVersions(current, previousVersion) <= 0) return;
  const { [UPDATE_KEY]: state = {} } = await chrome.storage.local.get(UPDATE_KEY);
  const writes = { [UPDATED_KEY]: { from: previousVersion, to: current, at: Date.now(), seen: false } };
  if (state.latest && compareVersions(state.latest.version, current) <= 0) {
    writes[UPDATE_KEY] = { ...state, status: 'latest', current };
  }
  await chrome.storage.local.set(writes);
}

/** کلیک روی اعلان نسخهٔ تازه → صفحهٔ انتشار در گیت‌هاب. */
export async function onUpdateNotificationClick(id) {
  if (id !== NOTIFICATION_ID) return false;
  const { [UPDATE_KEY]: state } = await chrome.storage.local.get(UPDATE_KEY);
  if (state?.latest?.url) await chrome.tabs.create({ url: state.latest.url });
  chrome.notifications.clear(id);
  return true;
}
