/**
 * حالت‌های بارگذاری، خالی و خطا.
 * قاعده: هیچ حالتی بدون توضیح «چه شد» و «حالا چه کنم» نمایش داده نمی‌شود.
 */

import { el, icon } from '../core/dom.js';
import { spot } from './spot-art.js';

/** اسکلت بارگذاری — وقتی می‌دانیم محتوای در راه چه شکلی دارد. */
export function skeleton({ rows = 3, height = '1rem' } = {}) {
  return el(
    'div',
    { class: 'state-skeleton', style: { display: 'flex', flexDirection: 'column', gap: '0.6rem' } },
    Array.from({ length: rows }, (_, index) =>
      el('div', {
        class: 'skeleton',
        style: { height, width: index % 3 === 2 ? '65%' : '100%' },
        'aria-hidden': 'true',
      }),
    ),
  );
}

/**
 * حالت خالی: توضیح چیزی که قرار است اینجا بیاید + یک اقدام روشن.
 */
export function emptyState({ title, description, actionLabel, onAction, iconName = 'dot' }) {
  return el('div', { class: 'state' }, [
    spot(iconName),
    title && el('p', { class: 'state__title', text: title }),
    description && el('p', { text: description }),
    actionLabel &&
      el('button', { class: 'btn btn--ghost', type: 'button', text: actionLabel, on: { click: onAction } }),
  ]);
}

/**
 * حالت خطا: چه شد و چه کاری از دست کاربر برمی‌آید — نه فقط کد خطا.
 */
export function errorState({ message, onRetry, retryLabel = 'تلاش دوباره' }) {
  return el('div', { class: 'state state--error', role: 'status' }, [
    spot('storm', { tone: 'warn' }),
    el('p', { class: 'state__title', text: 'داده‌ها بارگذاری نشد' }),
    el('p', { text: message || 'اتصال اینترنت را بررسی کنید.' }),
    onRetry && el('button', { class: 'btn btn--ghost', type: 'button', text: retryLabel, on: { click: onRetry } }),
  ]);
}

/** نشانهٔ «داده کهنه است» وقتی سرویس پاسخ نداد ولی کش داریم. */
export function staleBadge(at, formatTime) {
  return el('span', { class: 'stale-badge', title: 'آخرین داده‌های ذخیره‌شده نمایش داده می‌شود' }, [
    icon('cloud', { size: 13 }),
    `آفلاین · ${formatTime(at)}`,
  ]);
}
