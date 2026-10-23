/**
 * کیفیت هوا از Open-Meteo (مدل CAMS، بدون کلید API) — اختیاری.
 * برای شهرهایی مثل تهران، این عدد گاهی از خود دما مهم‌تر است.
 */

import { withCache, fetchWithTimeout } from './cache.js';

const ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality';
export const AIR_ORIGIN_PATTERN = 'https://air-quality-api.open-meteo.com/*';
const TTL = 30 * 60 * 1000;

/** @param {{latitude:number, longitude:number}} place */
export async function getAirQuality({ latitude, longitude }) {
  const key = `air:${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  return withCache(key, TTL, async () => {
    const url = new URL(ENDPOINT);
    url.searchParams.set('latitude', latitude);
    url.searchParams.set('longitude', longitude);
    url.searchParams.set('current', 'us_aqi,pm2_5,pm10');
    url.searchParams.set('timezone', 'auto');
    const response = await fetchWithTimeout(url.toString());
    const raw = await response.json();
    const current = raw?.current;
    if (!current || !Number.isFinite(current.us_aqi)) throw new Error('دادهٔ کیفیت هوا برای این شهر نیست');
    return { aqi: current.us_aqi, pm25: current.pm2_5 ?? null, pm10: current.pm10 ?? null, time: current.time ?? null };
  });
}
