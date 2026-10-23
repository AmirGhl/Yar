/**
 * نمودار خطی کوچک (اسپارک‌لاین) برای روند قیمت — SVG خالص، بدون کتابخانه.
 * زمان از چپ به راست است، حتی در صفحهٔ راست‌چین: محور زمان قرارداد جهانی نمودار است.
 */

const NS = 'http://www.w3.org/2000/svg';

/**
 * @param {Array<[number, number]>} points [timestamp, value]
 * @param {{width?:number, height?:number, label?:string}} options
 * @returns {SVGSVGElement}
 */
export function sparkline(points, { width = 280, height = 64, label = 'روند قیمت' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'spark');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  svg.setAttribute('dir', 'ltr');

  if (!points?.length || points.length < 2) return svg;

  const pad = 4;
  const times = points.map((point) => point[0]);
  const values = points.map((point) => point[1]);
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const v0 = Math.min(...values);
  const v1 = Math.max(...values);
  const x = (t) => pad + ((t - t0) / Math.max(1, t1 - t0)) * (width - pad * 2);
  // خط صاف (قیمت ثابت) وسط می‌نشیند، نه کف نمودار
  const y = (v) => (v1 === v0 ? height / 2 : pad + (1 - (v - v0) / (v1 - v0)) * (height - pad * 2));

  const coords = points.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`);
  const trend = values.at(-1) >= values[0] ? 'up' : 'down';
  svg.dataset.trend = trend;

  const area = document.createElementNS(NS, 'path');
  area.setAttribute('class', 'spark__area');
  area.setAttribute('d', `M${coords[0]} L${coords.join(' L')} L${x(t1).toFixed(1)},${height} L${x(t0).toFixed(1)},${height} Z`);

  const line = document.createElementNS(NS, 'polyline');
  line.setAttribute('class', 'spark__line');
  line.setAttribute('points', coords.join(' '));
  line.setAttribute('fill', 'none');
  line.setAttribute('vector-effect', 'non-scaling-stroke');

  const dot = document.createElementNS(NS, 'circle');
  dot.setAttribute('class', 'spark__dot');
  dot.setAttribute('cx', x(times.at(-1)).toFixed(1));
  dot.setAttribute('cy', y(values.at(-1)).toFixed(1));
  dot.setAttribute('r', '3');

  svg.append(area, line, dot);
  return svg;
}
