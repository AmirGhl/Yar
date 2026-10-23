/**
 * تصویرکِ حالت‌های خالی و خطا.
 *
 * یک آیکون خاکستریِ تنها وسط یک ناحیهٔ خالی، خودش شبیه خرابی به نظر می‌رسد.
 * اینجا همان آیکون روی یک لکهٔ رنگیِ نرم می‌نشیند و دو نقطه و یک کمان
 * دورش را می‌گیرند تا ناحیه «عمداً خالی» دیده شود، نه «خراب».
 *
 * سبک عمداً یکی است و برای همهٔ حالت‌ها کار می‌کند: آیکونِ همان بخش
 * زبان مشترک صفحه است و ساختن تصویرِ دستیِ جدا برای هر حالت، همان زبان
 * را می‌شکست.
 */

import { el, icon } from '../core/dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/* لکهٔ نامنظم — دایره بیش از حد مرتب است و شبیه «جای خالی آواتار» می‌شود */
const BLOB =
  'M36 5.5c13.2 0 24.9 7.4 28.6 18.8 3.7 11.4-.6 24.4-10.5 31.6s-23.2 8.1-33.4 1.4S3.6 39.3 6.1 27.5 22.8 5.5 36 5.5Z';

/** پس‌زمینهٔ تصویرک: لکه، کمانِ خط‌چین و دو نقطه. */
function backdrop(id) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 72 72');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('spot__art');
  svg.innerHTML = `
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop class="spot-stop-1" offset="0"/>
        <stop class="spot-stop-2" offset="1"/>
      </linearGradient>
    </defs>
    <path class="spot__blob" d="${BLOB}" fill="url(#${id})"/>
    <path class="spot__arc" d="M9 45a29 29 0 0 0 54 3" fill="none"/>
    <circle class="spot__dot" cx="62" cy="17" r="3"/>
    <circle class="spot__dot spot__dot--sm" cx="10" cy="24" r="1.8"/>`;
  return svg;
}

let uid = 0;

/**
 * تصویرک یک حالت. `iconName` همان آیکونی است که آن بخش در سربرگش دارد،
 * تا حالتِ خالی به بخشِ خودش وصل بماند.
 */
export function spot(iconName, { tone = 'quiet' } = {}) {
  return el('span', { class: `spot spot--${tone}` }, [
    backdrop(`spot${++uid}`),
    icon(iconName, { size: 26, className: 'spot__icon' }),
  ]);
}
