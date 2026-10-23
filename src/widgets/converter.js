/**
 * مبدل: ارز/طلا ↔ تومان، و تاریخ شمسی ↔ میلادی (همراه با قمری).
 *
 * هر دو حالت زنده‌اند — با هر تایپ نتیجه عوض می‌شود و دکمهٔ «محاسبه» ندارند.
 */

import { el, icon } from '../core/dom.js';
import { createCard, iconButton } from '../ui/card.js';
import { MESSAGE, send } from '../core/messaging.js';
import { MARKET_SYMBOLS } from '../core/defaults.js';
import { convertToRial, convertFromRial, DOLLAR_ID } from '../lib/convert.js';
import { formatNumber, toEnDigits, toFaDigits, compactNumber, timeAgo } from '../lib/format.js';
import { toJalali, fromJalali, jalaliMonthLength, JALALI_MONTHS } from '../lib/jalali.js';
import { describeDate, daysBetween, relativeDays, GREGORIAN_MONTHS } from '../lib/calendars.js';
import { toast } from '../ui/toast.js';

const META = Object.fromEntries(MARKET_SYMBOLS.map((item) => [item.id, item]));
const CONVERTIBLE = MARKET_SYMBOLS.filter((item) => item.unit !== 'index');

const parseAmount = (text) => {
  const value = Number(toEnDigits(text).replace(/[,،٬\s]/g, '').replace('٫', '.'));
  return Number.isFinite(value) ? value : null;
};

export function createConverter({ settings }) {
  const persianDigits = settings.appearance.persianDigits;
  const digits = (value) => (persianDigits ? toFaDigits(value) : String(value));
  const fmt = (value, fraction = 0) => formatNumber(value, { persianDigits, maximumFractionDigits: fraction });

  let mode = 'currency';
  const modeButtons = {};
  const modes = el('div', { class: 'converter__modes', role: 'group', 'aria-label': 'نوع تبدیل' });
  const view = el('div', { class: 'converter__view' });

  const { element, body } = createCard({ title: 'مبدل', iconName: 'swap' });
  body.append(modes, view);

  for (const [id, label] of [
    ['currency', 'ارز و طلا'],
    ['date', 'تاریخ'],
  ]) {
    modeButtons[id] = el('button', {
      class: 'chip',
      type: 'button',
      text: label,
      'aria-pressed': String(id === mode),
      on: { click: () => switchMode(id) },
    });
    modes.append(modeButtons[id]);
  }

  // ═════════ ارز ═════════
  let prices = new Map();
  let pricesAt = null;
  let reversed = false; // false: نماد → تومان ، true: تومان → نماد

  const amount = el('input', {
    class: 'input converter__amount tnum',
    type: 'text',
    inputmode: 'decimal',
    value: digits(1),
    'aria-label': 'مقدار',
    autocomplete: 'off',
  });
  const symbol = el(
    'select',
    { class: 'select', 'aria-label': 'ارز یا طلا' },
    CONVERTIBLE.map((item) => el('option', { value: item.id, text: item.label })),
  );
  const fromLabel = el('span', { class: 'converter__unit' });
  const swapButton = iconButton('swap', 'جابه‌جا کردن جهت تبدیل', () => {
    reversed = !reversed;
    amount.value = digits(reversed ? 1000000 : 1);
    renderCurrency();
  });
  const result = el('output', { class: 'converter__result tnum', 'aria-live': 'polite' });
  const resultSub = el('span', { class: 'converter__sub tnum' });
  const rate = el('p', { class: 'field__hint converter__rate' });

  const currencyView = el('div', { class: 'converter__pane' }, [
    el('div', { class: 'converter__row' }, [amount, fromLabel, symbol]),
    el('div', { class: 'converter__swap' }, [swapButton]),
    el('div', { class: 'converter__out' }, [
      result,
      resultSub,
      el('button', {
        class: 'icon-btn converter__copy',
        type: 'button',
        title: 'رونوشت نتیجه',
        'aria-label': 'رونوشت نتیجه',
        on: { click: copyResult },
      }, [icon('copy', { size: 15 })]),
    ]),
    rate,
  ]);

  const tomanOf = (rial) => (settings.market.currencyUnit === 'rial' ? rial : rial / 10);
  const localUnit = settings.market.currencyUnit === 'rial' ? 'ریال' : 'تومان';

  function renderCurrency() {
    const meta = META[symbol.value];
    const value = parseAmount(amount.value);
    fromLabel.textContent = reversed ? localUnit : '';
    fromLabel.hidden = !reversed;
    amount.classList.toggle('is-invalid', value == null);

    if (!prices.size) {
      result.textContent = '…';
      resultSub.textContent = '';
      rate.textContent = 'در حال دریافت نرخ‌ها…';
      return;
    }
    if (value == null) {
      result.textContent = '—';
      resultSub.textContent = 'عدد معتبر وارد کنید';
      return;
    }

    const unitRial = convertToRial(1, symbol.value, prices, META);
    if (unitRial == null) {
      result.textContent = '—';
      resultSub.textContent = 'نرخ این نماد در دسترس نیست';
      rate.textContent = '';
      return;
    }

    if (reversed) {
      const rial = settings.market.currencyUnit === 'rial' ? value : value * 10;
      const units = convertFromRial(rial, symbol.value, prices, META);
      result.textContent = `${fmt(units, units < 10 ? 4 : 2)} ${meta.label}`;
      resultSub.textContent = '';
    } else {
      const rial = convertToRial(value, symbol.value, prices, META);
      result.textContent = `${fmt(tomanOf(rial))} ${localUnit}`;
      resultSub.textContent = compactNumber(tomanOf(rial), { persianDigits });
    }
    const updated = pricesAt ? ` · ${timeAgo(pricesAt, { persianDigits })}` : '';
    rate.textContent = `هر ${meta.label} = ${fmt(tomanOf(unitRial))} ${localUnit}${updated}`;
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(toEnDigits(result.textContent));
      toast('نتیجه رونوشت شد');
    } catch {
      toast('رونوشت ممکن نشد');
    }
  }

  async function loadPrices() {
    try {
      const response = await send(MESSAGE.market, { symbols: [...new Set([DOLLAR_ID, ...CONVERTIBLE.map((item) => item.id)])] });
      prices = new Map(response.rows.map((row) => [row.id, row.price]));
      pricesAt = response.at;
    } catch (error) {
      rate.textContent = `نرخ‌ها بارگذاری نشد: ${error.message}`;
    }
    renderCurrency();
  }

  amount.addEventListener('input', renderCurrency);
  symbol.addEventListener('change', renderCurrency);

  // ═════════ تاریخ ═════════
  const today = new Date();
  const todayJ = toJalali(today);
  let dateFrom = 'jalali'; // jalali | gregorian

  const numberInput = (label, value, width) =>
    el('input', {
      class: 'input tnum',
      type: 'text',
      inputmode: 'numeric',
      value: digits(value),
      'aria-label': label,
      style: { width },
      autocomplete: 'off',
    });

  const dayInput = numberInput('روز', todayJ.jd, '3.4rem');
  const monthSelect = el('select', { class: 'select', 'aria-label': 'ماه' });
  const yearInput = numberInput('سال', todayJ.jy, '4.6rem');

  const fillMonths = () => {
    const names = dateFrom === 'jalali' ? JALALI_MONTHS : GREGORIAN_MONTHS;
    const selected = Number(monthSelect.value) || 1;
    monthSelect.replaceChildren(
      ...names.map((name, index) => el('option', { value: String(index + 1), text: name, selected: index + 1 === selected })),
    );
  };

  const fromButtons = {};
  const fromGroup = el('div', { class: 'converter__modes converter__modes--sub', role: 'group', 'aria-label': 'تقویم ورودی' });
  for (const [id, label] of [
    ['jalali', 'از شمسی'],
    ['gregorian', 'از میلادی'],
  ]) {
    fromButtons[id] = el('button', {
      class: 'chip',
      type: 'button',
      text: label,
      'aria-pressed': String(id === dateFrom),
      on: { click: () => switchDateFrom(id) },
    });
    fromGroup.append(fromButtons[id]);
  }

  const dateOut = el('div', { class: 'converter__dates', 'aria-live': 'polite' });

  const dateView = el('div', { class: 'converter__pane' }, [
    fromGroup,
    el('div', { class: 'converter__row' }, [dayInput, monthSelect, yearInput]),
    dateOut,
    el('button', {
      class: 'btn btn--ghost converter__today',
      type: 'button',
      text: 'امروز',
      on: { click: () => setDateInputs(new Date()) },
    }),
  ]);

  function readDate() {
    const y = Number(toEnDigits(yearInput.value));
    const m = Number(monthSelect.value);
    const d = Number(toEnDigits(dayInput.value));
    if (![y, m, d].every(Number.isInteger) || d < 1) return null;
    try {
      if (dateFrom === 'jalali') {
        if (y < 1 || y > 3000 || d > jalaliMonthLength(y, m)) return null;
        return fromJalali(y, m, d);
      }
      const date = new Date(y, m - 1, d);
      return date.getMonth() === m - 1 && y > 0 ? date : null;
    } catch {
      return null; // سال خارج از بازهٔ الگوریتم جلالی
    }
  }

  function setDateInputs(date) {
    if (dateFrom === 'jalali') {
      const j = toJalali(date);
      yearInput.value = digits(j.jy);
      monthSelect.value = String(j.jm);
      dayInput.value = digits(j.jd);
    } else {
      yearInput.value = digits(date.getFullYear());
      monthSelect.value = String(date.getMonth() + 1);
      dayInput.value = digits(date.getDate());
    }
    renderDate();
  }

  function switchDateFrom(id) {
    const current = readDate() ?? new Date();
    dateFrom = id;
    Object.entries(fromButtons).forEach(([key, button]) => button.setAttribute('aria-pressed', String(key === id)));
    fillMonths();
    setDateInputs(current);
  }

  function renderDate() {
    const date = readDate();
    if (!date) {
      dateOut.replaceChildren(el('p', { class: 'field__hint', text: 'تاریخ معتبر نیست.' }));
      return;
    }
    const info = describeDate(date, { persianDigits });
    const distance = daysBetween(new Date(), date);
    const row = (label, value) =>
      el('div', { class: 'converter__date-row' }, [el('span', { text: label }), el('b', { text: value ?? '—' })]);
    dateOut.replaceChildren(
      row('روز هفته', info.weekday),
      dateFrom === 'jalali' ? row('میلادی', info.gregorian) : row('شمسی', info.jalali),
      row('قمری (تقریبی)', info.hijri),
      row('فاصله تا امروز', relativeDays(distance, { persianDigits })),
    );
  }

  [dayInput, yearInput].forEach((input) => input.addEventListener('input', renderDate));
  monthSelect.addEventListener('change', renderDate);

  function switchMode(id) {
    mode = id;
    Object.entries(modeButtons).forEach(([key, button]) => button.setAttribute('aria-pressed', String(key === id)));
    view.replaceChildren(id === 'currency' ? currencyView : dateView);
    if (id === 'currency' && !prices.size) loadPrices();
  }

  fillMonths();
  monthSelect.value = String(todayJ.jm);
  renderDate();
  symbol.value = DOLLAR_ID;
  switchMode('currency');
  renderCurrency();

  return { element, refresh: loadPrices };
}
