/** آب‌وهوا از Open-Meteo (بدون کلید API) + جست‌وجوی شهر. */

import { withCache, fetchWithTimeout } from './cache.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const TTL = 20 * 60 * 1000;

/** کد WMO → توضیح فارسی + نام آیکون. */
const WMO = {
  0: ['آفتابی', 'sun'],
  1: ['کمی ابری', 'sun'],
  2: ['نیمه‌ابری', 'cloud'],
  3: ['ابری', 'cloud'],
  45: ['مه', 'fog'],
  48: ['مه یخ‌زده', 'fog'],
  51: ['نم‌نم باران', 'rain'],
  53: ['نم‌نم باران', 'rain'],
  55: ['نم‌نم باران شدید', 'rain'],
  56: ['نم‌نم یخ‌زده', 'rain'],
  57: ['نم‌نم یخ‌زدهٔ شدید', 'rain'],
  61: ['باران خفیف', 'rain'],
  63: ['باران', 'rain'],
  65: ['باران شدید', 'rain'],
  66: ['باران یخ‌زده', 'rain'],
  67: ['باران یخ‌زدهٔ شدید', 'rain'],
  71: ['برف خفیف', 'snow'],
  73: ['برف', 'snow'],
  75: ['برف سنگین', 'snow'],
  77: ['دانه‌های برف', 'snow'],
  80: ['رگبار خفیف', 'rain'],
  81: ['رگبار', 'rain'],
  82: ['رگبار شدید', 'rain'],
  85: ['رگبار برف', 'snow'],
  86: ['رگبار برف سنگین', 'snow'],
  95: ['رعد و برق', 'storm'],
  96: ['رعد و برق با تگرگ', 'storm'],
  99: ['رعد و برق با تگرگ شدید', 'storm'],
};

export function describeWeather(code) {
  const [text, iconName] = WMO[code] ?? ['نامشخص', 'cloud'];
  return { text, icon: iconName };
}

/**
 * وضعیت فعلی + پیش‌بینی ۶ روز آینده.
 * @param {{latitude:number, longitude:number, timeZone?:string, unit?:string}} location
 */
export async function getWeather({ latitude, longitude, timeZone = 'auto', unit = 'celsius' }) {
  const key = `weather:${latitude.toFixed(2)},${longitude.toFixed(2)},${unit}`;
  return withCache(key, TTL, async () => {
    const url = new URL(FORECAST_URL);
    url.searchParams.set('latitude', latitude);
    url.searchParams.set('longitude', longitude);
    url.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max');
    url.searchParams.set('hourly', 'temperature_2m,weather_code');
    url.searchParams.set('forecast_days', '6');
    url.searchParams.set('timezone', timeZone || 'auto');
    url.searchParams.set('temperature_unit', unit === 'fahrenheit' ? 'fahrenheit' : 'celsius');

    const response = await fetchWithTimeout(url.toString());
    const raw = await response.json();

    const daily = (raw.daily?.time ?? []).map((date, index) => ({
      date,
      code: raw.daily.weather_code[index],
      max: raw.daily.temperature_2m_max[index],
      min: raw.daily.temperature_2m_min[index],
      sunrise: raw.daily.sunrise?.[index] ?? null,
      sunset: raw.daily.sunset?.[index] ?? null,
      rainChance: raw.daily.precipitation_probability_max?.[index] ?? null,
    }));

    const nowIso = raw.current?.time;
    const hourIndex = Math.max(0, (raw.hourly?.time ?? []).findIndex((t) => t >= nowIso));
    const hourly = (raw.hourly?.time ?? [])
      .slice(hourIndex, hourIndex + 12)
      .map((time, offset) => ({
        time,
        temperature: raw.hourly.temperature_2m[hourIndex + offset],
        code: raw.hourly.weather_code[hourIndex + offset],
      }));

    return {
      current: {
        temperature: raw.current?.temperature_2m ?? null,
        feelsLike: raw.current?.apparent_temperature ?? null,
        humidity: raw.current?.relative_humidity_2m ?? null,
        wind: raw.current?.wind_speed_10m ?? null,
        code: raw.current?.weather_code ?? 0,
        isDay: raw.current?.is_day === 1,
        time: nowIso,
      },
      daily,
      hourly,
      unit,
      timeZone: raw.timezone,
    };
  });
}

/**
 * جست‌وجوی شهر برای انتخاب موقعیت.
 * @param {string} query
 */
export async function searchCity(query) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { data: [], at: Date.now(), stale: false };

  return withCache(`geocode:${trimmed}`, 24 * 60 * 60 * 1000, async () => {
    const url = new URL(GEOCODE_URL);
    url.searchParams.set('name', trimmed);
    url.searchParams.set('count', '8');
    url.searchParams.set('language', 'fa');
    url.searchParams.set('format', 'json');

    const response = await fetchWithTimeout(url.toString());
    const raw = await response.json();
    return (raw.results ?? []).map((item) => ({
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      country: item.country ?? '',
      admin: item.admin1 ?? '',
      timeZone: item.timezone,
    }));
  });
}
