/**
 * سبد دارایی: چه دارید و امروز چقدر می‌ارزد.
 *
 * مقدار هر دارایی را خود کاربر وارد می‌کند و فقط روی همین دستگاه می‌ماند.
 * ارزش با نرخ‌های زندهٔ همان نوار پایین حساب می‌شود؛ قیمت خرید اختیاری است
 * و اگر باشد سود و زیان هم نشان داده می‌شود. در «حالت پنهان» همهٔ اعداد محو می‌شوند.
 */

import { el, icon } from '../core/dom.js';
import { createCard, iconButton } from '../ui/card.js';
import { emptyState } from '../ui/states.js';
import { toast } from '../ui/toast.js';
import { MESSAGE, send } from '../core/messaging.js';
import { readData, writeData, onDataChanged, STORAGE_KEYS } from '../core/storage.js';
import { MARKET_SYMBOLS } from '../core/defaults.js';
import { DOLLAR_ID } from '../lib/convert.js';
import { valuePortfolio } from '../lib/portfolio.js';
import { formatNumber, compactNumber, toEnDigits, toFaDigits, timeAgo } from '../lib/format.js';
import { fromDisplay, unitLabel } from '../lib/market-format.js';

const META = Object.fromEntries(MARKET_SYMBOLS.map((item) => [item.id, item]));
const HOLDABLE = MARKET_SYMBOLS.filter((item) => item.unit !== 'index');
const MAX_HOLDINGS = 40;

const parseNumber = (text) => {
  const cleaned = toEnDigits(String(text ?? '')).replace(/[,،٬\s]/g, '').replace('٫', '.');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : NaN;
};

export function createPortfolio({ settings }) {
  const persianDigits = settings.appearance.persianDigits;
  const currencyUnit = settings.market.currencyUnit;
  const local = currencyUnit === 'rial' ? 'ریال' : 'تومان';
  const digits = (value) => (persianDigits ? toFaDigits(value) : String(value));
  const money = (rial) => formatNumber(currencyUnit === 'rial' ? rial : rial / 10, { persianDigits });
  const percentText = (value) => `${value >= 0 ? '+' : '−'}${formatNumber(Math.abs(value), { persianDigits, maximumFractionDigits: 2 })}٪`;

  /** @type {Array<{id:string, symbolId:string, amount:number, buyPrice?:number|null}>} */
  let holdings = [];
  /** @type {Map<string, {price:number, changePercent:number}>} */
  let rows = new Map();
  let pricesAt = null;

  // --- جمع کل ---
  const total = el('b', { class: 'portfolio__total tnum', 'data-sensitive': '' });
  const totalSub = el('span', { class: 'portfolio__total-sub tnum', 'data-sensitive': '' });
  const day = el('span', { class: 'portfolio__day tnum', 'data-sensitive': '' });
  const summary = el('div', { class: 'portfolio__summary', 'aria-live': 'polite' }, [
    el('span', { class: 'portfolio__caption', text: `ارزش کل (${local})` }),
    total,
    el('div', { class: 'portfolio__meta' }, [day, totalSub]),
  ]);

  const list = el('ul', { class: 'portfolio__list' });
  const footnote = el('p', { class: 'field__hint portfolio__note' });

  // --- افزودن ---
  const symbolSelect = el(
    'select',
    { class: 'select', 'aria-label': 'دارایی' },
    HOLDABLE.map((item) => el('option', { value: item.id, text: item.label })),
  );
  const amountInput = el('input', { class: 'input tnum', type: 'text', inputmode: 'decimal', placeholder: 'مقدار', 'aria-label': 'مقدار', autocomplete: 'off' });
  const buyInput = el('input', { class: 'input tnum', type: 'text', inputmode: 'decimal', 'aria-label': 'قیمت خرید هر واحد (اختیاری)', autocomplete: 'off' });
  const syncBuyPlaceholder = () => {
    buyInput.placeholder = `قیمت خرید هر واحد (${unitLabel(META[symbolSelect.value], currencyUnit)}، اختیاری)`;
  };
  symbolSelect.addEventListener('change', syncBuyPlaceholder);
  syncBuyPlaceholder();

  const form = el('form', { class: 'portfolio__form' }, [
    el('div', { class: 'converter__row' }, [symbolSelect, amountInput]),
    el('div', { class: 'converter__row' }, [
      buyInput,
      el('button', { class: 'btn btn--primary', type: 'submit', 'aria-label': 'افزودن به سبد' }, [icon('plus', { size: 16 })]),
    ]),
  ]);

  const { element, body } = createCard({
    title: 'سبد دارایی',
    iconName: 'wallet',
    actions: [iconButton('refresh', 'به‌روزرسانی نرخ‌ها', () => loadPrices())],
  });
  body.append(summary, list, footnote, form);

  const save = () => writeData(STORAGE_KEYS.portfolio, holdings);

  function render() {
    if (!holdings.length) {
      summary.hidden = true;
      footnote.textContent = 'فقط روی همین دستگاه ذخیره می‌شود. با کلید H همهٔ اعداد پنهان می‌شوند.';
      list.replaceChildren(
        emptyState({
          iconName: 'wallet',
          title: 'سبد خالی است',
          description: 'سکه، طلا، نقره، ارز یا رمزارزی که دارید را اضافه کنید تا ارزش روزش را ببینید.',
        }),
      );
      return;
    }

    summary.hidden = false;
    if (!rows.size) {
      total.textContent = '…';
      day.textContent = '';
      totalSub.textContent = '';
      list.replaceChildren();
      return;
    }

    const result = valuePortfolio(holdings, rows, META);
    total.textContent = money(result.total);
    totalSub.textContent = `حدود ${compactNumber(currencyUnit === 'rial' ? result.total : result.total / 10, { persianDigits })}`;
    day.textContent = `${percentText(result.dayChangePercent)} امروز`;
    day.dataset.dir = result.dayChange > 0 ? 'up' : result.dayChange < 0 ? 'down' : 'flat';
    if (result.profit != null) {
      day.textContent += ` · سود/زیان ${result.profit >= 0 ? '+' : '−'}${money(Math.abs(result.profit))}`;
    }

    list.replaceChildren(
      ...result.items.map((item) => {
        const meta = META[item.symbolId];
        const amount = formatNumber(item.amount, { persianDigits, maximumFractionDigits: 4 });
        return el('li', { class: 'portfolio__row' }, [
          el('div', { class: 'portfolio__row-main' }, [
            el('span', { class: 'portfolio__name' }, [
              el('b', { text: meta?.label ?? item.symbolId }),
              el('small', { class: 'tnum', 'data-sensitive': '', text: `× ${amount}` }),
            ]),
            el('span', { class: 'portfolio__value tnum', 'data-sensitive': '', text: item.value == null ? 'نرخ ندارد' : money(item.value) }),
            el('button', {
              class: 'icon-btn portfolio__remove',
              type: 'button',
              'aria-label': `حذف ${meta?.label ?? item.symbolId} از سبد`,
              title: 'حذف',
              on: { click: () => remove(item.id) },
            }, [icon('close', { size: 13 })]),
          ]),
          el('div', { class: 'portfolio__row-sub' }, [
            el('span', { class: 'portfolio__share', 'aria-hidden': 'true', style: { '--share': String(item.share) } }),
            el('span', { class: 'tnum', text: `${digits(Math.round(item.share * 100))}٪` }),
            item.profitPercent != null &&
              el('span', {
                class: 'portfolio__profit tnum',
                'data-sensitive': '',
                'data-dir': item.profit >= 0 ? 'up' : 'down',
                text: percentText(item.profitPercent),
              }),
          ]),
        ]);
      }),
    );

    const stale = pricesAt ? ` · نرخ‌ها ${timeAgo(pricesAt, { persianDigits })}` : '';
    footnote.textContent = `${result.missing.length ? 'برای بعضی دارایی‌ها نرخ در دسترس نیست. ' : ''}فقط روی همین دستگاه${stale}`;
  }

  async function remove(id) {
    const index = holdings.findIndex((holding) => holding.id === id);
    if (index < 0) return;
    const [removed] = holdings.splice(index, 1);
    await save();
    render();
    toast(`${META[removed.symbolId]?.label ?? 'دارایی'} از سبد حذف شد`, {
      actionLabel: 'برگرداندن',
      onAction: async () => {
        holdings.splice(index, 0, removed);
        await save();
        render();
      },
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const amount = parseNumber(amountInput.value);
    const buy = parseNumber(buyInput.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast('مقدار معتبر وارد کنید — مثلاً ۲ یا ۰٫۵');
      amountInput.focus();
      return;
    }
    if (buy != null && (!Number.isFinite(buy) || buy <= 0)) {
      toast('قیمت خرید معتبر نیست؛ می‌توانید خالی بگذارید');
      buyInput.focus();
      return;
    }
    if (holdings.length >= MAX_HOLDINGS) {
      toast(`حداکثر ${digits(MAX_HOLDINGS)} ردیف`);
      return;
    }
    const meta = META[symbolSelect.value];
    // همان دارایی دوباره؟ مقدارها جمع می‌شوند، مگر قیمت خرید متفاوتی داده شده باشد (خرید جدا)
    const buyPrice = buy == null ? null : fromDisplay(meta, buy, currencyUnit);
    const existing = holdings.find((holding) => holding.symbolId === meta.id && (buyPrice == null ? holding.buyPrice == null : false));
    if (existing) existing.amount += amount;
    else holdings.push({ id: crypto.randomUUID(), symbolId: meta.id, amount, buyPrice });
    amountInput.value = '';
    buyInput.value = '';
    await save();
    render();
    toast(`${meta.label} به سبد اضافه شد`);
  });

  async function loadPrices() {
    try {
      const response = await send(MESSAGE.market, { symbols: [...new Set([DOLLAR_ID, ...HOLDABLE.map((item) => item.id)])] });
      rows = new Map(response.rows.map((row) => [row.id, row]));
      pricesAt = response.at;
    } catch (error) {
      footnote.textContent = `نرخ‌ها بارگذاری نشد: ${error.message}`;
    }
    render();
  }

  const unsubscribe = onDataChanged(STORAGE_KEYS.portfolio, (next) => {
    holdings = Array.isArray(next) ? next : [];
    render();
  });

  (async () => {
    const stored = await readData(STORAGE_KEYS.portfolio, []);
    holdings = Array.isArray(stored) ? stored : [];
    render();
    loadPrices();
  })();

  return {
    element,
    refresh: loadPrices,
    /** از جزئیات نماد: فرم با همان نماد آماده می‌شود و فوکوس به مقدار می‌رود */
    prefill(symbolId) {
      if (META[symbolId] && META[symbolId].unit !== 'index') symbolSelect.value = symbolId;
      syncBuyPlaceholder();
      amountInput.focus();
    },
    destroy: unsubscribe,
  };
}
