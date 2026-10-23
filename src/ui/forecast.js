/**
 * جزئیات آب‌وهوا: وضعیت فعلی، ۱۲ ساعت آینده و ۶ روز پیش رو.
 * داده همان پاسخ کش‌شدهٔ کارت امروز است؛ باز کردن این پنجره درخواست تازه نمی‌فرستد.
 */

import { el, icon } from '../core/dom.js';
import { openDialog } from './dialog.js';
import { weatherScene, sceneNameFor } from './weather-art.js';
import { WMO_TEXT } from '../lib/weather-codes.js';
import { toFaDigits, timeAgo } from '../lib/format.js';
import { JALALI_WEEKDAYS, persianWeekday } from '../lib/jalali.js';
import { describeAqi } from '../lib/aqi.js';

/**
 * @param {{data:object, at:number, stale:boolean}} result پاسخ سرویس آب‌وهوا
 * @param {{settings:object, onChangeCity:()=>void}} context
 */
export function openForecast(result, { settings, air = null, onChangeCity }) {
  const persianDigits = settings.appearance.persianDigits;
  const digits = (value) => (persianDigits ? toFaDigits(value) : String(value));
  const degrees = (value) => (Number.isFinite(value) ? `${digits(Math.round(value))}°` : '—');
  const { current, daily = [], hourly = [] } = result.data;
  const today = daily[0];

  const timeOf = (iso) => (iso ? digits(iso.slice(11, 16)) : '—');
  // Open-Meteo تاریخ روزانه را به‌صورت YYYY-MM-DD به وقت محلی شهر می‌دهد
  const dayName = (iso, index) => {
    if (index === 0) return 'امروز';
    if (index === 1) return 'فردا';
    const [y, m, d] = iso.split('-').map(Number);
    return JALALI_WEEKDAYS[persianWeekday(new Date(y, m - 1, d))];
  };

  const stat = (iconName, label, value) =>
    el('div', { class: 'forecast__stat' }, [icon(iconName, { size: 15 }), el('span', { text: label }), el('b', { class: 'tnum', text: value })]);

  const now = el('div', { class: 'forecast__now' }, [
    el('div', { class: 'forecast__now-art' }, [weatherScene(sceneNameFor(current.code ?? 0, current.isDay), { size: 64 })]),
    el('div', { class: 'forecast__now-text' }, [
      el('b', { class: 'forecast__temp tnum', text: degrees(current.temperature) }),
      el('span', { text: WMO_TEXT[current.code] ?? '—' }),
      today && el('span', { class: 'forecast__range tnum', text: `بیشینه ${degrees(today.max)} · کمینه ${degrees(today.min)}` }),
    ]),
  ]);

  const stats = el('div', { class: 'forecast__stats' }, [
    stat('thermometer', 'احساس واقعی', degrees(current.feelsLike)),
    stat('droplet', 'رطوبت', Number.isFinite(current.humidity) ? `${digits(Math.round(current.humidity))}٪` : '—'),
    stat('wind', 'باد', Number.isFinite(current.wind) ? `${digits(Math.round(current.wind))} کیلومتر بر ساعت` : '—'),
    today?.rainChance != null && stat('rain', 'احتمال بارش', `${digits(today.rainChance)}٪`),
    today?.sunrise && stat('sunrise', 'طلوع', timeOf(today.sunrise)),
    today?.sunset && stat('sunset', 'غروب', timeOf(today.sunset)),
    air && describeAqi(air.aqi) && stat('wind', 'کیفیت هوا (AQI)', `${digits(Math.round(air.aqi))} · ${describeAqi(air.aqi).label}`),
    air && Number.isFinite(air.pm25) && stat('fog', 'ذرات PM2.5', `${digits(Math.round(air.pm25))} µg/m³`),
  ]);

  const hours = hourly.length
    ? el(
        'div',
        { class: 'forecast__hours', role: 'list', 'aria-label': 'ساعت‌های آینده' },
        hourly.map((hour, index) =>
          el('div', { class: 'forecast__hour', role: 'listitem' }, [
            el('span', { class: 'tnum', text: index === 0 ? 'اکنون' : timeOf(hour.time) }),
            weatherScene(sceneNameFor(hour.code ?? 0, isDayHour(hour.time, today)), { size: 26 }),
            el('b', { class: 'tnum', text: degrees(hour.temperature) }),
          ]),
        ),
      )
    : null;

  // نوار دما روی بازهٔ کل هفته: کمینه و بیشینهٔ هر روز به نسبت سرترین و سردترین روز
  const weekMin = Math.min(...daily.map((day) => day.min));
  const weekMax = Math.max(...daily.map((day) => day.max));
  const spread = Math.max(1, weekMax - weekMin);

  const days = el(
    'ul',
    { class: 'forecast__days', 'aria-label': 'روزهای آینده' },
    daily.map((day, index) =>
      el('li', { class: 'forecast__day' }, [
        el('span', { class: 'forecast__day-name', text: dayName(day.date, index) }),
        weatherScene(sceneNameFor(day.code ?? 0, true), { size: 24 }),
        el('span', { class: 'forecast__day-text', text: WMO_TEXT[day.code] ?? '' }),
        el('span', { class: 'forecast__day-min tnum', text: degrees(day.min) }),
        el('span', {
          class: 'forecast__bar',
          'aria-hidden': 'true',
          style: {
            '--from': String((day.min - weekMin) / spread),
            '--to': String((day.max - weekMin) / spread),
          },
        }),
        el('span', { class: 'forecast__day-max tnum', text: degrees(day.max) }),
      ]),
    ),
  );

  let dialog = null;
  const content = el('div', { class: 'forecast' }, [
    now,
    stats,
    hours,
    days,
    el('div', { class: 'forecast__foot' }, [
      el('span', {
        class: 'field__hint',
        text: `${result.stale ? 'آفلاین · ' : ''}به‌روزرسانی ${timeAgo(result.at, { persianDigits })} · Open-Meteo`,
      }),
      el('button', {
        class: 'btn btn--ghost',
        type: 'button',
        on: {
          click: () => {
            dialog.close();
            onChangeCity();
          },
        },
      }, [icon('location', { size: 15 }), 'تغییر شهر']),
    ]),
  ]);

  // اسکرول عمودی چرخ موس روی نوار ساعت‌ها، افقی حرکتش می‌دهد
  hours?.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    hours.scrollLeft -= event.deltaY;
  }, { passive: false });

  dialog = openDialog({
    title: `آب‌وهوای ${settings.weather.city.name}`,
    iconName: 'cloud',
    content,
    className: 'dialog--forecast',
  });
  return dialog;
}

/** آیا یک ساعت (ISO محلی شهر) بین طلوع و غروب امروز است؟ برای انتخاب صحنهٔ شب/روز. */
function isDayHour(iso, today) {
  if (!iso || !today?.sunrise || !today?.sunset) return true;
  const minutes = (value) => Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));
  const t = minutes(iso);
  return t >= minutes(today.sunrise) && t < minutes(today.sunset);
}
