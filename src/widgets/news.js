/**
 * خبرخوان چندمنبعی.
 * تیترهایی که باز کرده‌اید کم‌رنگ می‌شوند (فقط روی همین دستگاه)، و با چیپ‌های
 * بالای فهرست می‌شود فقط یک منبع را دید.
 */

import { el } from '../core/dom.js';
import { createCard, iconButton } from '../ui/card.js';
import { skeleton, errorState, emptyState } from '../ui/states.js';
import { MESSAGE, send } from '../core/messaging.js';
import { timeAgo } from '../lib/format.js';
import { readData, writeData } from '../core/storage.js';

const READ_KEY = 'yar:news-read';
const MAX_READ = 400;

export function createNews({ settings, openSettings }) {
  const persianDigits = settings.appearance.persianDigits;
  const { element, body } = createCard({
    title: 'اخبار',
    iconName: 'news',
    actions: [
      iconButton('settings', 'مدیریت منابع خبری', () => openSettings('news')),
      iconButton('refresh', 'به‌روزرسانی اخبار', () => load({ force: true })),
    ],
  });

  /** @type {Set<string>} */
  let read = new Set();
  let source = null; // null یعنی همهٔ منابع
  let last = { items: [], failed: [] };

  async function markRead(link) {
    if (read.has(link)) return;
    read.add(link);
    // قدیمی‌ترین‌ها اول دور ریخته می‌شوند تا این فهرست بی‌پایان بزرگ نشود
    await writeData(READ_KEY, [...read].slice(-MAX_READ));
  }

  const renderItems = (allItems, failed) => {
    last = { items: allItems, failed };
    const sources = [...new Set(allItems.map((item) => item.source))];
    if (source && !sources.includes(source)) source = null;
    const items = source ? allItems.filter((item) => item.source === source) : allItems;
    if (!items.length) {
      body.replaceChildren(
        emptyState({
          iconName: 'news',
          title: 'خبری برای نمایش نیست',
          description: 'یک منبع خبری فعال کنید تا تیترها اینجا بیایند.',
          actionLabel: 'مدیریت منابع',
          onAction: () => openSettings('news'),
        }),
      );
      return;
    }

    const filters =
      sources.length > 1
        ? el('div', { class: 'news__filters', role: 'group', 'aria-label': 'منبع خبر' }, [
            el('button', { class: 'chip', type: 'button', text: 'همه', 'aria-pressed': String(!source), on: { click: () => pick(null) } }),
            ...sources.map((name) =>
              el('button', { class: 'chip', type: 'button', text: name, 'aria-pressed': String(source === name), on: { click: () => pick(name) } }),
            ),
          ])
        : null;

    const list = el(
      'div',
      { class: 'news__list' },
      items.map((item) =>
        el('a', {
          class: 'news__item',
          href: item.link,
          target: '_blank',
          rel: 'noopener noreferrer',
          'data-read': String(read.has(item.link)),
          on: {
            // auxclick: کلیک وسط موس هم «خوانده‌شده» حساب شود
            click: (event) => {
              markRead(item.link);
              event.currentTarget.dataset.read = 'true';
            },
            auxclick: (event) => {
              markRead(item.link);
              event.currentTarget.dataset.read = 'true';
            },
          },
        }, [
          item.image &&
            el('img', {
              class: 'news__thumb',
              src: item.image,
              alt: '',
              loading: 'lazy',
              referrerpolicy: 'no-referrer',
              on: { error: (event) => event.target.remove() },
            }),
          el('div', { class: 'news__body' }, [
            el('span', { class: 'news__title', text: item.title }),
            el('span', { class: 'news__meta' }, [
              el('span', { text: item.source }),
              item.publishedAt && el('span', { text: timeAgo(item.publishedAt, { persianDigits }) }),
            ]),
          ]),
        ]),
      ),
    );

    body.replaceChildren(...[filters, list].filter(Boolean));

    if (failed?.length) {
      body.append(
        el('p', {
          class: 'field__hint',
          text: `${failed.map((entry) => entry.label).join('، ')} پاسخ نداد.`,
        }),
      );
    }
  };

  function pick(name) {
    source = name;
    renderItems(last.items, last.failed);
  }

  async function load({ force = false } = {}) {
    if (!read.size) read = new Set((await readData(READ_KEY, [])) ?? []);
    if (force || !body.firstChild) body.replaceChildren(skeleton({ rows: 4, height: '2.6rem' }));
    try {
      const result = await send(MESSAGE.news, { feeds: settings.news.feeds, limit: settings.news.limit });
      renderItems(result.items, result.failed);
    } catch (error) {
      body.replaceChildren(errorState({ message: error.message, onRetry: () => load({ force: true }) }));
    }
  }

  load();
  return { element, refresh: () => load({ force: true }) };
}
