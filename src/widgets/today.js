/**
 * کارت «امروز» — ساعت، تاریخ شمسی، آب‌وهوا و مناسبت روز، همه در یک سطح.
 *
 * این چهار چیز همیشه با هم خوانده می‌شوند («الان ساعت چند است و بیرون چه خبر است؟»)،
 * پس چهار کارت جدا فقط مرز اضافه می‌ساخت. یک کارت، بدون سربرگ و بدون عنوان تکراری.
 */

import { el } from '../core/dom.js';
import { MESSAGE, send } from '../core/messaging.js';
import { toFaDigits, pad2 } from '../lib/format.js';
import { toJalali, persianWeekday, JALALI_MONTHS, JALALI_WEEKDAYS } from '../lib/jalali.js';
import { getOccasions } from '../lib/holidays.js';
import { WMO_TEXT } from '../lib/weather-codes.js';
import { weatherScene, sceneNameFor } from '../ui/weather-art.js';
import { openForecast } from '../ui/forecast.js';
import { describeAqi } from '../lib/aqi.js';

function greetingFor(hour, name) {
  const who = name ? `، ${name}` : '';
  if (hour < 5) return `شب بخیر${who}`;
  if (hour < 12) return `صبح بخیر${who}`;
  if (hour < 17) return `ظهر بخیر${who}`;
  if (hour < 20) return `عصر بخیر${who}`;
  return `شب بخیر${who}`;
}

export function createToday({ settings, openSettings }) {
  const digits = (value) => (settings.appearance.persianDigits ? toFaDigits(value) : String(value));

  // --- ستون راست: ساعت و تاریخ ---
  const timeText = el('span', { class: 'tnum' });
  const secondsText = el('span', { class: 'today__seconds tnum' });
  const clock = el('div', { class: 'today__clock', role: 'timer' }, [timeText, secondsText]);
  const weekday = el('span', { class: 'today__weekday' });
  const date = el('span', { class: 'today__date' });
  const greeting = el('p', { class: 'today__greeting' });

  // --- ستون چپ: آب‌وهوا ---
  const glyph = el('div', { class: 'today__glyph' }, [weatherScene('cloud', { size: 38 })]);
  const temp = el('div', { class: 'today__temp tnum', text: '—' });
  const condition = el('span', { class: 'today__condition', text: 'در حال دریافت…' });
  const city = el('button', {
    class: 'today__city',
    type: 'button',
    title: 'تغییر شهر',
    // بعد از خطا همین دکمه «تلاش دوباره» است، نه راه تنظیمات
    on: { click: () => (weatherFailed ? loadWeather() : openSettings('weather')) },
  });
  let weatherFailed = false;
  const range = el('span', { class: 'today__range tnum' });

  /** آخرین پاسخ آب‌وهوا — پنجرهٔ پیش‌بینی از همین می‌خواند و درخواست تازه نمی‌فرستد. */
  let weatherResult = null;

  const weatherSide = el('button', {
    class: 'today__weather',
    type: 'button',
    title: 'پیش‌بینی ساعتی و روزانه',
    'aria-label': 'آب‌وهوا — نمایش پیش‌بینی',
    on: {
      click: () => {
        if (!weatherResult) {
          openSettings('weather');
          return;
        }
        openForecast(weatherResult, { settings, air: airResult, onChangeCity: () => openSettings('weather') });
      },
    },
  }, [glyph, el('div', { class: 'today__weather-text' }, [temp, condition, range])]);

  const occasion = el('div', { class: 'today__occasion' });

  // کیفیت هوا — فقط اگر کاربر روشنش کرده باشد (مجوز جداگانه)
  let airResult = null;
  const air = el('button', {
    class: 'today__air',
    type: 'button',
    hidden: true,
    on: { click: () => weatherSide.click() },
  });

  async function loadAir() {
    if (!settings.weather.airQuality) return;
    try {
      const { data } = await send(MESSAGE.air, settings.weather.city);
      const level = describeAqi(data.aqi);
      if (!level) return;
      airResult = data;
      air.dataset.level = level.id;
      air.title = `${level.advice}${Number.isFinite(data.pm25) ? ` — PM2.5: ${Math.round(data.pm25)} µg/m³` : ''}`;
      air.replaceChildren(el('i', { class: 'today__air-dot', 'aria-hidden': 'true' }), `هوا ${digits(level.value)} · ${level.label}`);
      air.hidden = false;
    } catch {
      air.hidden = true; // بدون مجوز یا بدون داده: بی‌صدا کنار می‌رود
    }
  }

  const element = el('section', { class: 'card card--plain today', 'aria-label': 'امروز' }, [
    el('div', { class: 'today__main' }, [
      el('div', { class: 'today__now' }, [clock, el('div', { class: 'today__meta' }, [weekday, date])]),
      weatherSide,
    ]),
    greeting,
    air,
    occasion,
    city,
  ]);

  // --- ساعت ---
  let timer = null;
  let lastDateKey = '';

  const renderDate = (now) => {
    const jalali = toJalali(now);
    const day = persianWeekday(now);
    const { events, isHoliday } = getOccasions(jalali, now, { weekday: day });

    weekday.textContent = JALALI_WEEKDAYS[day];
    weekday.classList.toggle('is-holiday', isHoliday);
    date.textContent = `${digits(jalali.jd)} ${JALALI_MONTHS[jalali.jm - 1]} ${digits(jalali.jy)}`;

    const headline = events[0];
    occasion.textContent = headline ? headline.title : '';
    occasion.hidden = !headline;
    occasion.classList.toggle('is-holiday', Boolean(headline?.holiday));
    if (events.length > 1) occasion.title = events.map((event) => event.title).join(' · ');
  };

  const tick = () => {
    const now = new Date();
    timeText.textContent = digits(`${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
    secondsText.textContent = settings.general.seconds ? digits(pad2(now.getSeconds())) : '';
    clock.setAttribute('aria-label', `ساعت ${pad2(now.getHours())} و ${pad2(now.getMinutes())} دقیقه`);

    greeting.textContent = settings.general.greeting ? greetingFor(now.getHours(), settings.general.userName) : '';
    greeting.hidden = !settings.general.greeting;

    const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    if (key !== lastDateKey) {
      lastDateKey = key;
      renderDate(now);
    }
  };

  // روی مرز دقیقهٔ بعد بیدار می‌شویم، نه هر ثانیه — مگر ثانیه‌شمار روشن باشد
  const schedule = () => {
    const delay = settings.general.seconds ? 1000 - (Date.now() % 1000) : 60000 - (Date.now() % 60000);
    timer = setTimeout(() => {
      tick();
      schedule();
    }, delay);
  };

  // --- آب‌وهوا ---
  async function loadWeather() {
    city.textContent = settings.weather.city.name;
    try {
      const place = settings.weather.city;
      const result = await send(MESSAGE.weather, {
        latitude: place.latitude,
        longitude: place.longitude,
        timeZone: place.timeZone,
        unit: settings.weather.unit,
      });
      weatherResult = result;
      const { current, daily } = result.data;
      const code = current.code ?? 0;

      glyph.replaceChildren(weatherScene(sceneNameFor(code, current.isDay), { size: 38 }));
      temp.textContent = `${digits(Math.round(current.temperature))}°`;
      condition.textContent = WMO_TEXT[code] ?? '—';
      const today = daily?.[0];
      range.textContent = today ? `${digits(Math.round(today.max))}° / ${digits(Math.round(today.min))}°` : '';
      city.textContent = `${place.name}${result.stale ? ' · آفلاین' : ''}`;
      weatherFailed = false;
    } catch (error) {
      temp.textContent = '—';
      condition.textContent = 'آب‌وهوا در دسترس نیست';
      range.textContent = '';
      city.textContent = `${settings.weather.city.name} · تلاش دوباره`;
      weatherFailed = true;
    }
  }

  tick();
  schedule();
  loadWeather();
  loadAir();

  return {
    element,
    refresh: loadWeather,
    destroy() {
      clearTimeout(timer);
    },
  };
}
