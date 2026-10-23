/**
 * نوار نرخ‌ها — یک ردیف باریک به‌جای یک پنل کامل.
 *
 * هر نماد فقط سه چیز نشان می‌دهد: آیکون گروهش، عدد، و جهت تغییر.
 * نام نماد ریز و کم‌رنگ می‌ماند چون آیکون بیشتر کار را می‌کند.
 */

import { el, icon } from '../core/dom.js';
import { MESSAGE, send } from '../core/messaging.js';
import { MARKET_SYMBOLS } from '../core/defaults.js';
import { formatNumber } from '../lib/format.js';
import { formatPrice } from '../lib/market-format.js';
import { openSymbolDetail } from '../ui/symbol-detail.js';

/** تا وقتی تب جلوی چشم است، نرخ‌ها خودشان تازه می‌شوند (کش سرویس‌ورکر ۴ دقیقه است). */
const REFRESH_MS = 5 * 60 * 1000;

const META = Object.fromEntries(MARKET_SYMBOLS.map((item) => [item.id, item]));

/** آیکون هر گروه — به‌جای یک آیکون برای هر نماد، که فقط شلوغی می‌آورد. */
const GROUP_ICON = {
  currency: 'banknote',
  gold: 'coin',
  crypto: 'bitcoin',
  silver: 'bar',
  global: 'chart',
};

export function createTicker({ settings, openSettings, addToPortfolio }) {
  const persianDigits = settings.appearance.persianDigits;

  const strip = el('div', { class: 'ticker__strip' });
  const element = el('div', { class: 'ticker', role: 'status', 'aria-label': 'نرخ بازار' }, [
    strip,
    el(
      'button',
      {
        class: 'ticker__more icon-btn',
        type: 'button',
        title: 'انتخاب نمادها',
        'aria-label': 'انتخاب نمادهای بازار',
        on: { click: () => openSettings('market') },
      },
      [icon('settings', { size: 15 })],
    ),
  ]);

  const priceOf = (row) => formatPrice(META[row.id], row.price, { currencyUnit: settings.market.currencyUnit, persianDigits });

  const skeletonChips = () =>
    Array.from({ length: Math.max(3, settings.market.symbols.length) }, () =>
      el('span', { class: 'ticker__chip ticker__chip--loading' }, [
        el('span', { class: 'skeleton', style: { width: '4.5rem', height: '0.85rem' } }),
      ]),
    );

  const render = (rows, stale) => {
    if (!rows.length) {
      strip.replaceChildren(
        el('button', {
          class: 'ticker__chip ticker__chip--empty',
          type: 'button',
          text: 'نمادی انتخاب نشده — انتخاب کنید',
          on: { click: () => openSettings('market') },
        }),
      );
      return;
    }

    strip.replaceChildren(
      ...rows.map((row) => {
        const meta = META[row.id];
        const direction = row.direction > 0 ? 'up' : row.direction < 0 ? 'down' : 'flat';
        const percent = formatNumber(Math.abs(row.changePercent), { persianDigits, maximumFractionDigits: 2 });

        return el(
          'button',
          {
            class: 'ticker__chip',
            type: 'button',
            on: { click: () => openSymbolDetail({ row, settings, onAddToPortfolio: addToPortfolio }) },
            'data-dir': direction,
            /* گروه روی خود چیپ می‌نشیند تا CSS بتواند به نماد رنگ گروهش را بدهد */
            'data-group': meta?.group ?? 'global',
            title: `${meta?.label ?? row.id}${stale ? ' — آخرین دادهٔ ذخیره‌شده' : ''} — کلیک برای جزئیات و هشدار`,
          },
          [
            icon(GROUP_ICON[meta?.group] ?? 'chart', { size: 14, className: 'ticker__icon' }),
            el('span', { class: 'ticker__label', text: meta?.label ?? row.id }),
            el('b', { class: 'tnum', 'data-sensitive': '', text: priceOf(row) }),
            direction !== 'flat' &&
              el(
                'span',
                {
                  class: 'ticker__delta tnum',
                  'aria-label': `${direction === 'up' ? 'افزایش' : 'کاهش'} ${percent} درصد`,
                },
                [icon(direction === 'up' ? 'arrowUp' : 'arrowDown', { size: 11 }), `${percent}٪`],
              ),
          ],
        );
      }),
    );
    element.classList.toggle('is-stale', Boolean(stale));
  };

  let loadedAt = 0;

  async function load({ quiet = false } = {}) {
    // تازه‌سازی خودکار بی‌صداست: اسکلت فقط بار اول دیده می‌شود، نه هر ۵ دقیقه
    if (!quiet || !strip.querySelector('.ticker__chip:not(.ticker__chip--loading)')) strip.replaceChildren(...skeletonChips());
    try {
      const result = await send(MESSAGE.market, { symbols: settings.market.symbols });
      render(result.rows, result.stale);
      loadedAt = Date.now();
    } catch (error) {
      strip.replaceChildren(
        el('button', {
          class: 'ticker__chip ticker__chip--empty',
          type: 'button',
          text: `نرخ‌ها بارگذاری نشد — تلاش دوباره`,
          title: error.message,
          on: { click: load },
        }),
      );
    }
  }

  const refreshIfDue = () => {
    if (document.visibilityState === 'visible' && Date.now() - loadedAt >= REFRESH_MS) load({ quiet: true });
  };
  const interval = setInterval(refreshIfDue, 60 * 1000);
  document.addEventListener('visibilitychange', refreshIfDue);

  load();
  return {
    element,
    refresh: load,
    destroy() {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfDue);
    },
  };
}
