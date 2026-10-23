/**
 * تایمر تمرکز (پومودورو).
 * زمان پایان ذخیره می‌شود، نه زمان باقی‌مانده — پس بستن تب شمارش را خراب نمی‌کند.
 *
 * چند تب جدید می‌توانند هم‌زمان باز باشند؛ حالت در storage مشترک است و هر تغییر
 * در بقیهٔ تب‌ها هم دیده می‌شود. «پایان جلسه» فقط یک بار ثبت می‌شود: تبی که
 * زودتر برسد حالت را عوض می‌کند و بقیه همان را می‌پذیرند.
 */

import { el } from '../core/dom.js';
import { createCard } from '../ui/card.js';
import { readData, writeData, onDataChanged, STORAGE_KEYS } from '../core/storage.js';
import { MESSAGE, send } from '../core/messaging.js';
import { toFaDigits, pad2 } from '../lib/format.js';
import { toast } from '../ui/toast.js';
import { playChime } from '../ui/chime.js';

const CIRCUMFERENCE = 2 * Math.PI * 44;

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

export function createTimer({ settings }) {
  const persianDigits = settings.appearance.persianDigits;
  const digits = (value) => (persianDigits ? toFaDigits(value) : String(value));
  const modes = {
    focus: { label: 'تمرکز', minutes: settings.timer.focusMinutes },
    break: { label: 'استراحت', minutes: settings.timer.breakMinutes },
  };

  /** @type {{mode:'focus'|'break', endsAt:number|null, remaining:number, sessions?:{day:string, count:number}}} */
  let state = { mode: 'focus', endsAt: null, remaining: modes.focus.minutes * 60, sessions: { day: todayKey(), count: 0 } };
  let ticker = null;

  const bar = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  for (const [node, className] of [
    [track, 'timer__track'],
    [bar, 'timer__bar'],
  ]) {
    node.setAttribute('cx', '50');
    node.setAttribute('cy', '50');
    node.setAttribute('r', '44');
    node.setAttribute('fill', 'none');
    node.setAttribute('stroke-width', '6');
    node.setAttribute('class', className);
  }
  bar.setAttribute('stroke-dasharray', String(CIRCUMFERENCE));

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.append(track, bar);

  const value = el('div', { class: 'timer__value tnum' });
  const modeName = el('div', { class: 'timer__mode' });
  const dial = el('div', { class: 'timer__dial', role: 'timer', 'aria-live': 'off' }, [svg, el('div', { class: 'timer__center' }, [value, modeName])]);

  const primary = el('button', { class: 'btn btn--primary', type: 'button' });
  const reset = el('button', { class: 'btn btn--ghost', type: 'button', text: 'صفر کردن' });
  const stats = el('p', { class: 'timer__stats' });

  const modeButtons = Object.entries(modes).map(([id, mode]) =>
    el('button', {
      class: 'chip',
      type: 'button',
      text: `${mode.label} ${digits(mode.minutes)}′`,
      'aria-pressed': String(state.mode === id),
      on: { click: () => switchMode(id) },
    }),
  );

  const controls = el('div', { class: 'timer__controls' }, [
    el('div', { class: 'timer__modes' }, modeButtons),
    el('div', { class: 'timer__buttons' }, [primary, reset]),
    stats,
  ]);

  const { element, body } = createCard({ title: 'تایمر تمرکز', iconName: 'timer' });
  body.append(el('div', { class: 'timer' }, [dial, controls]));

  const totalSeconds = (mode = state.mode) => modes[mode].minutes * 60;

  const remainingSeconds = () =>
    state.endsAt ? Math.max(0, Math.round((state.endsAt - Date.now()) / 1000)) : state.remaining;

  const sessionsToday = () => (state.sessions?.day === todayKey() ? state.sessions.count : 0);

  function paint() {
    const remaining = remainingSeconds();
    const total = totalSeconds();
    value.textContent = digits(`${pad2(Math.floor(remaining / 60))}:${pad2(remaining % 60)}`);
    modeName.textContent = state.endsAt ? modes[state.mode].label : remaining < total ? 'متوقف' : modes[state.mode].label;
    dial.setAttribute('aria-label', `${modes[state.mode].label}: ${Math.ceil(remaining / 60)} دقیقه باقی مانده`);
    dial.dataset.mode = state.mode;
    dial.dataset.running = String(Boolean(state.endsAt));

    const ratio = total ? remaining / total : 0;
    bar.setAttribute('stroke-dashoffset', String(CIRCUMFERENCE * (1 - ratio)));

    primary.textContent = state.endsAt ? 'توقف' : remaining < total ? 'ادامه' : 'شروع';
    modeButtons.forEach((button, index) => {
      button.setAttribute('aria-pressed', String(Object.keys(modes)[index] === state.mode));
    });

    const count = sessionsToday();
    stats.textContent = count ? `امروز ${digits(count)} جلسهٔ تمرکز · ${digits(count * modes.focus.minutes)} دقیقه` : 'امروز هنوز جلسه‌ای ثبت نشده';

    // شمارش روی عنوان تب: تب‌های دیگر که باز باشند، هنوز می‌بینند چقدر مانده
    if (state.endsAt) document.title = `${digits(`${pad2(Math.floor(remaining / 60))}:${pad2(remaining % 60)}`)} · ${modes[state.mode].label} — یار`;
    else if (document.title !== 'یار' && document.title.endsWith('— یار')) document.title = 'یار';
  }

  function persist() {
    return writeData(STORAGE_KEYS.timer, state);
  }

  /** سپردن پایان تایمر به سرویس‌ورکر برای اعلان، یا لغو آن. شکستش نباید تایمر را خراب کند. */
  function scheduleAlarm() {
    const next = modes[state.mode === 'focus' ? 'break' : 'focus'].label;
    send(MESSAGE.timerSchedule, { endsAt: state.endsAt, label: modes[state.mode].label, next }).catch(() => {});
  }

  function stopTicker() {
    clearInterval(ticker);
    ticker = null;
  }

  function startTicker() {
    stopTicker();
    ticker = setInterval(() => {
      if (remainingSeconds() <= 0) {
        finish({ announce: true });
        return;
      }
      paint();
    }, 250);
  }

  /**
   * پایان یک جلسه. اگر تب دیگری زودتر همین جلسه را تمام کرده، فقط حالتش را می‌پذیریم.
   * @param {{announce:boolean}} options `announce` = صدا و توست (وقتی کاربر همین‌جاست)
   */
  async function finish({ announce }) {
    stopTicker();
    const finishedEndsAt = state.endsAt;
    const stored = await readData(STORAGE_KEYS.timer);
    if (stored && stored.endsAt !== finishedEndsAt) {
      state = stored;
      paint();
      return;
    }

    const finishedMode = state.mode;
    const sessions = { day: todayKey(), count: sessionsToday() + (finishedMode === 'focus' ? 1 : 0) };
    const nextMode = finishedMode === 'focus' ? 'break' : 'focus';
    state = { mode: nextMode, endsAt: null, remaining: totalSeconds(nextMode), sessions };
    await persist();
    paint();

    if (announce) {
      if (settings.timer.sound !== false) playChime();
      toast(`${modes[finishedMode].label} تمام شد — نوبت ${modes[nextMode].label} است`);
    }
  }

  async function toggle() {
    if (state.endsAt) {
      state = { ...state, remaining: remainingSeconds(), endsAt: null };
      stopTicker();
    } else {
      const remaining = state.remaining > 0 ? state.remaining : totalSeconds();
      state = { ...state, endsAt: Date.now() + remaining * 1000, remaining };
      startTicker();
    }
    await persist();
    scheduleAlarm();
    paint();
  }

  async function switchMode(mode) {
    stopTicker();
    state = { ...state, mode, endsAt: null, remaining: modes[mode].minutes * 60 };
    await persist();
    scheduleAlarm();
    paint();
  }

  primary.addEventListener('click', toggle);
  reset.addEventListener('click', () => switchMode(state.mode));

  // تغییر از تب دیگر
  const unsubscribe = onDataChanged(STORAGE_KEYS.timer, (next) => {
    if (!next || !modes[next.mode]) return;
    state = next;
    if (state.endsAt && state.endsAt > Date.now()) startTicker();
    else stopTicker();
    paint();
  });

  (async () => {
    const stored = await readData(STORAGE_KEYS.timer);
    if (stored && modes[stored.mode]) {
      state = { sessions: { day: todayKey(), count: 0 }, ...stored };
      if (state.endsAt && state.endsAt > Date.now()) startTicker();
      // جلسه‌ای که وقتی تب بسته بود تمام شده: ثبت می‌شود، ولی بی‌صدا
      else if (state.endsAt) await finish({ announce: false });
    }
    paint();
  })();

  paint();

  return {
    element,
    /** برای پالت فرمان */
    toggle,
    destroy() {
      stopTicker();
      unsubscribe();
    },
  };
}
