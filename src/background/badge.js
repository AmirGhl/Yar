/**
 * نشان روی آیکون افزونه در نوار ابزار:
 *  - وقتی تایمر تمرکز در حال شمارش است، دقیقه‌های باقی‌مانده (حتی با تب بسته)؛
 *  - و یک «✓» کوتاه وقتی چیزی از منوی راست‌کلیک یا نوار آدرس ثبت شد.
 */

const TICK_ALARM = 'yar:badge-tick';
const TIMER_KEY = 'yar:timer';
const FLASH_MS = 1800;

let flashing = false;

const minutesLeft = (endsAt) => Math.max(0, Math.ceil((endsAt - Date.now()) / 60000));

/** نشان را از روی حالت فعلی تایمر می‌سازد. */
export async function syncTimerBadge() {
  if (flashing) return;
  const { [TIMER_KEY]: timer } = await chrome.storage.local.get(TIMER_KEY);
  const running = timer?.endsAt && timer.endsAt > Date.now();
  if (!running) {
    await chrome.action.setBadgeText({ text: '' });
    await chrome.alarms.clear(TICK_ALARM);
    return;
  }
  await chrome.action.setBadgeBackgroundColor({ color: timer.mode === 'break' ? '#059669' : '#0284c7' });
  await chrome.action.setBadgeText({ text: `${minutesLeft(timer.endsAt)}′` });
  // زنگ دقیقه‌ای فقط تا وقتی تایمر می‌شمارد زنده است
  const existing = await chrome.alarms.get(TICK_ALARM);
  if (!existing) await chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
}

/** «✓» کوتاه برای تأیید یک کار پس‌زمینه، و بعد برگشت به نشان تایمر. */
export async function flashBadge(text = '✓', color = '#16a34a') {
  flashing = true;
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => {
    flashing = false;
    syncTimerBadge().catch(() => {});
  }, FLASH_MS);
}

export function isBadgeAlarm(name) {
  return name === TICK_ALARM;
}

export function watchTimerForBadge() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[TIMER_KEY]) syncTimerBadge().catch(() => {});
  });
}
