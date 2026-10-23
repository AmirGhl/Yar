/**
 * صحنه‌های آب‌وهوا — SVG رنگی و متحرک به‌جای آیکون تک‌خطی.
 *
 * چرا صحنه و نه آیکون: آب‌وهوا تنها چیزی در صفحه است که کاربر با یک نگاهِ
 * نیم‌ثانیه‌ای می‌خواندش. شکل رنگی و متحرک قبل از رسیدن نگاه به عدد دما
 * جواب را داده است؛ یک گلیف خاکستری این کار را نمی‌کند.
 *
 * اینجا فقط *شکل* ساخته می‌شود. رنگ‌ها و حرکت در widgets.css تعریف شده‌اند
 * تا تم روشن/تیره و «حرکت کمتر» بتوانند همان‌جا سراغشان بروند.
 */

import { WMO_ICON } from '../lib/weather-codes.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/*
 * شناسهٔ گرادیان‌ها باید در کل سند یکتا باشد: اگر کارت امروز و پاپ‌آپ
 * هر دو `#wx-sun` بسازند، مرورگر اولی را به هر دو می‌دهد.
 */
let uid = 0;

/** ابر — سه دایره و یک مستطیل گِرد که با هم یک نمای تو‌پر می‌سازند. */
function cloud(fill, className = 'wx__cloud') {
  return `<g class="${className}" fill="url(#${fill})">
    <circle cx="25" cy="32" r="11"/>
    <circle cx="39" cy="34.5" r="8.5"/>
    <rect x="15" y="34" width="32" height="11" rx="5.5"/>
  </g>`;
}

/** قرص خورشید با پرتوهای چرخان. `cx/cy/r` تا بشود پشت ابر هم نشاندش. */
function sun(id, { cx = 32, cy = 32, r = 11, rays = true } = {}) {
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    const inner = r + 4;
    const outer = r + 9;
    return `<line x1="${(cx + x * inner).toFixed(1)}" y1="${(cy + y * inner).toFixed(1)}"
      x2="${(cx + x * outer).toFixed(1)}" y2="${(cy + y * outer).toFixed(1)}"/>`;
  }).join('');

  return `${rays ? `<g class="wx__rays" style="transform-origin:${cx}px ${cy}px">${spokes}</g>` : ''}
    <circle class="wx__sun" cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>`;
}

/** ماه هلالی — با ماسک ساخته می‌شود، نه با مسیر دستی: هلالِ مسیری در اندازهٔ کوچک می‌شکند. */
function moon(id, maskId, { cx = 32, cy = 32, r = 12.5 } = {}) {
  return `<mask id="${maskId}">
      <rect width="64" height="64" fill="#000"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>
      <circle cx="${cx + 8.5}" cy="${cy - 6}" r="${r - 1.5}" fill="#000"/>
    </mask>
    <circle class="wx__moon" cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})" mask="url(#${maskId})"/>`;
}

/** ستاره‌های ریزِ چشمک‌زن برای صحنه‌های شبانه. */
function stars(points) {
  return points
    .map(([cx, cy, r], i) => `<circle class="wx__star" cx="${cx}" cy="${cy}" r="${r}" style="--i:${i}"/>`)
    .join('');
}

/** قطره یا دانه‌های در حال ریزش زیر ابر. */
function fall(kind, columns) {
  return columns
    .map(([x, delay], i) =>
      kind === 'snow'
        ? `<circle class="wx__flake" cx="${x}" cy="46" r="2.2" style="--i:${delay ?? i}"/>`
        : `<line class="wx__drop" x1="${x}" y1="46" x2="${x - 1.5}" y2="51" style="--i:${delay ?? i}"/>`,
    )
    .join('');
}

/**
 * سازندهٔ هر صحنه. کلیدها همان نام‌های WMO_ICON هستند به‌اضافهٔ نسخهٔ شبانه.
 * هر سازنده یک قطعه markup می‌گیرد که داخل <svg viewBox="0 0 64 64"> می‌نشیند.
 */
const SCENES = {
  sun: (id) => `
    <defs>
      <radialGradient id="${id}-sun" cx="35%" cy="30%">
        <stop class="wx-stop-sun-1" offset="0"/>
        <stop class="wx-stop-sun-2" offset="1"/>
      </radialGradient>
    </defs>
    ${sun(`${id}-sun`)}`,

  moon: (id) => `
    <defs>
      <linearGradient id="${id}-moon" x1="0" y1="0" x2="1" y2="1">
        <stop class="wx-stop-moon-1" offset="0"/>
        <stop class="wx-stop-moon-2" offset="1"/>
      </linearGradient>
    </defs>
    ${stars([
      [14, 16, 1.6],
      [50, 20, 1.3],
      [46, 48, 1.1],
    ])}
    ${moon(`${id}-moon`, `${id}-mask`)}`,

  cloud: (id) => `
    <defs>
      <radialGradient id="${id}-sun" cx="35%" cy="30%">
        <stop class="wx-stop-sun-1" offset="0"/>
        <stop class="wx-stop-sun-2" offset="1"/>
      </radialGradient>
      <linearGradient id="${id}-cloud" x1="0" y1="0" x2="0" y2="1">
        <stop class="wx-stop-cloud-1" offset="0"/>
        <stop class="wx-stop-cloud-2" offset="1"/>
      </linearGradient>
    </defs>
    ${sun(`${id}-sun`, { cx: 42, cy: 21, r: 8 })}
    ${cloud(`${id}-cloud`)}`,

  cloudNight: (id) => `
    <defs>
      <linearGradient id="${id}-moon" x1="0" y1="0" x2="1" y2="1">
        <stop class="wx-stop-moon-1" offset="0"/>
        <stop class="wx-stop-moon-2" offset="1"/>
      </linearGradient>
      <linearGradient id="${id}-cloud" x1="0" y1="0" x2="0" y2="1">
        <stop class="wx-stop-cloud-1" offset="0"/>
        <stop class="wx-stop-cloud-2" offset="1"/>
      </linearGradient>
    </defs>
    ${stars([
      [14, 15, 1.5],
      [52, 40, 1.2],
    ])}
    ${moon(`${id}-moon`, `${id}-mask`, { cx: 42, cy: 21, r: 9 })}
    ${cloud(`${id}-cloud`)}`,

  fog: (id) => `
    <defs>
      <linearGradient id="${id}-cloud" x1="0" y1="0" x2="0" y2="1">
        <stop class="wx-stop-cloud-1" offset="0"/>
        <stop class="wx-stop-cloud-2" offset="1"/>
      </linearGradient>
    </defs>
    ${cloud(`${id}-cloud`)}
    <g class="wx__fog">
      <line class="wx__haze" x1="12" y1="50" x2="46" y2="50" style="--i:0"/>
      <line class="wx__haze" x1="18" y1="56" x2="52" y2="56" style="--i:1"/>
    </g>`,

  rain: (id) => `
    <defs>
      <linearGradient id="${id}-cloud" x1="0" y1="0" x2="0" y2="1">
        <stop class="wx-stop-cloud-1" offset="0"/>
        <stop class="wx-stop-cloud-2" offset="1"/>
      </linearGradient>
    </defs>
    ${cloud(`${id}-cloud`)}
    <g class="wx__rain">${fall('rain', [[21, 0], [30, 1], [39, 2], [46, 3]])}</g>`,

  snow: (id) => `
    <defs>
      <linearGradient id="${id}-cloud" x1="0" y1="0" x2="0" y2="1">
        <stop class="wx-stop-cloud-1" offset="0"/>
        <stop class="wx-stop-cloud-2" offset="1"/>
      </linearGradient>
    </defs>
    ${cloud(`${id}-cloud`)}
    <g class="wx__snow">${fall('snow', [[22, 0], [32, 1], [42, 2]])}</g>`,

  storm: (id) => `
    <defs>
      <linearGradient id="${id}-cloud" x1="0" y1="0" x2="0" y2="1">
        <stop class="wx-stop-storm-1" offset="0"/>
        <stop class="wx-stop-storm-2" offset="1"/>
      </linearGradient>
    </defs>
    ${cloud(`${id}-cloud`, 'wx__cloud wx__cloud--dark')}
    <g class="wx__rain">${fall('rain', [[20, 0], [44, 2]])}</g>
    <path class="wx__bolt" d="M34 43 25 56h5.5l-2 7 9.5-12h-5.5l3.5-8z"/>`,
};

/**
 * نام صحنه از روی کد WMO و روز/شب.
 * شب فقط دو صحنه را عوض می‌کند: آفتاب می‌شود ماه، و ابرِ روز ابرِ شب.
 * باران در شب هم باران است — تغییرش فقط سر و صدا بود.
 */
export function sceneNameFor(code, isDay = true) {
  const base = WMO_ICON[code] ?? 'cloud';
  if (isDay) return base;
  if (base === 'sun') return 'moon';
  if (base === 'cloud') return 'cloudNight';
  return base;
}

/** ساخت عنصر SVG صحنه. اگر نام ناشناخته باشد، ابر برمی‌گردد. */
export function weatherScene(name, { size = 40, className = '' } = {}) {
  const build = SCENES[name] ?? SCENES.cloud;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('wx');
  if (className) svg.classList.add(...className.split(' '));
  svg.innerHTML = build(`wx${++uid}`);
  return svg;
}
