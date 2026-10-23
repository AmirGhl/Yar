/**
 * جزئیات یک نماد بازار (با کلیک روی چیپ نوار نرخ‌ها):
 * قیمت و تغییر امروز، سقف و کف روز، روند ۷ روزهٔ محلی، و هشدارهای قیمت.
 */

import { el, icon } from '../core/dom.js';
import { openDialog } from './dialog.js';
import { sparkline } from './sparkline.js';
import { toast } from './toast.js';
import { MESSAGE, send } from '../core/messaging.js';
import { MARKET_SYMBOLS } from '../core/defaults.js';
import { readData, writeData, onDataChanged, STORAGE_KEYS } from '../core/storage.js';
import { requestPermissions } from '../core/permissions.js';
import { createAlert, isTriggered, MAX_ALERTS } from '../lib/alerts.js';
import { summarize } from '../lib/history.js';
import { formatPrice, fromDisplay, toDisplay, unitLabel } from '../lib/market-format.js';
import { toEnDigits, toFaDigits, formatNumber, timeAgo } from '../lib/format.js';

const META = Object.fromEntries(MARKET_SYMBOLS.map((item) => [item.id, item]));

/**
 * @param {{row:object, settings:object, onAddToPortfolio?:(symbolId:string)=>void}} options
 */
export function openSymbolDetail({ row, settings, onAddToPortfolio }) {
  const meta = META[row.id] ?? { id: row.id, label: row.id, unit: 'toman' };
  const persianDigits = settings.appearance.persianDigits;
  const currencyUnit = settings.market.currencyUnit;
  const digits = (value) => (persianDigits ? toFaDigits(value) : String(value));
  const price = (raw) => formatPrice(meta, raw, { currencyUnit, persianDigits });
  const unit = unitLabel(meta, currencyUnit);
  const direction = row.direction > 0 ? 'up' : row.direction < 0 ? 'down' : 'flat';

  // --- قیمت ---
  const head = el('div', { class: 'symbol__head' }, [
    el('b', { class: 'symbol__price tnum', 'data-sensitive': '' }, [price(row.price), el('small', { text: ` ${meta.unit === 'usd' ? '' : unit}` })]),
    el('span', { class: 'symbol__delta tnum', 'data-dir': direction }, [
      direction !== 'flat' && icon(direction === 'up' ? 'arrowUp' : 'arrowDown', { size: 13 }),
      `${formatNumber(Math.abs(row.changePercent ?? 0), { persianDigits, maximumFractionDigits: 2 })}٪ امروز`,
    ]),
  ]);

  const range = Number.isFinite(row.high) && Number.isFinite(row.low)
    ? el('div', { class: 'symbol__range tnum' }, [
        el('span', {}, ['کف روز ', el('b', { text: price(row.low) })]),
        el('span', {}, ['سقف روز ', el('b', { text: price(row.high) })]),
      ])
    : null;

  // --- روند ---
  const chart = el('div', { class: 'symbol__chart' }, [el('div', { class: 'skeleton', style: { height: '4rem' } })]);
  const chartNote = el('p', { class: 'field__hint symbol__chart-note' });

  send(MESSAGE.marketHistory, { symbols: [row.id] })
    .then((history) => {
      const points = history[row.id] ?? [];
      const summary = summarize(points);
      if (!summary) {
        chart.replaceChildren();
        chartNote.textContent = 'تاریخچه روی همین دستگاه جمع می‌شود — چند ساعت دیگر روند اینجا دیده می‌شود.';
        return;
      }
      const span = (points.at(-1)[0] - points[0][0]) / 3600000;
      const spanText = span >= 36 ? `${digits(Math.round(span / 24))} روز` : `${digits(Math.max(1, Math.round(span)))} ساعت`;
      chart.replaceChildren(sparkline(points, { label: `روند ${meta.label} در ${spanText} گذشته` }));
      const sign = summary.changePercent >= 0 ? '+' : '−';
      chartNote.textContent = `${spanText} گذشته: ${sign}${formatNumber(Math.abs(summary.changePercent), { persianDigits, maximumFractionDigits: 1 })}٪ · کمینه ${price(summary.min)} · بیشینه ${price(summary.max)}`;
    })
    .catch(() => {
      chart.replaceChildren();
      chartNote.textContent = 'تاریخچه در دسترس نیست.';
    });

  // --- هشدارها ---
  const alertList = el('ul', { class: 'symbol__alerts' });
  const directionSelect = el('select', { class: 'select', 'aria-label': 'جهت هشدار' }, [
    el('option', { value: 'above', text: 'بالاتر از' }),
    el('option', { value: 'below', text: 'پایین‌تر از' }),
  ]);
  const targetInput = el('input', {
    class: 'input tnum',
    type: 'text',
    inputmode: 'decimal',
    'aria-label': `قیمت هدف به ${unit}`,
    value: digits(meta.unit === 'usd' ? toDisplay(meta, row.price, currencyUnit).toFixed(2) : Math.round(toDisplay(meta, row.price, currencyUnit))),
  });
  const alertForm = el('form', { class: 'symbol__alert-form' }, [
    directionSelect,
    targetInput,
    el('span', { class: 'converter__unit', text: unit }),
    el('button', { class: 'btn btn--primary', type: 'submit' }, [icon('bell', { size: 15 }), 'هشدار']),
  ]);

  async function renderAlerts() {
    const all = (await readData(STORAGE_KEYS.alerts, [])) ?? [];
    const mine = all.filter((alert) => alert.symbolId === row.id);
    alertList.replaceChildren(
      ...mine.map((alert) =>
        el('li', { class: 'symbol__alert', 'data-active': String(alert.active) }, [
          icon('bell', { size: 14 }),
          el('span', {
            class: 'tnum',
            text: `${alert.direction === 'above' ? 'بالاتر از' : 'پایین‌تر از'} ${price(alert.target)}`,
          }),
          el('small', {
            text: alert.active ? 'فعال' : `زد ${timeAgo(alert.firedAt, { persianDigits })}`,
          }),
          !alert.active &&
            el('button', {
              class: 'chip',
              type: 'button',
              text: 'دوباره',
              on: { click: () => updateAlert(alert.id, { active: true, firedAt: null, firedPrice: null }) },
            }),
          el('button', {
            class: 'icon-btn',
            type: 'button',
            'aria-label': 'حذف هشدار',
            title: 'حذف هشدار',
            on: { click: () => removeAlert(alert.id) },
          }, [icon('close', { size: 13 })]),
        ]),
      ),
    );
    alertList.hidden = !mine.length;
  }

  async function updateAlert(id, patch) {
    const all = (await readData(STORAGE_KEYS.alerts, [])) ?? [];
    await writeData(STORAGE_KEYS.alerts, all.map((alert) => (alert.id === id ? { ...alert, ...patch } : alert)));
  }

  async function removeAlert(id) {
    const all = (await readData(STORAGE_KEYS.alerts, [])) ?? [];
    await writeData(STORAGE_KEYS.alerts, all.filter((alert) => alert.id !== id));
  }

  alertForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = Number(toEnDigits(targetInput.value).replace(/[,،٬\s]/g, '').replace('٫', '.'));
    let alert;
    try {
      alert = createAlert({ symbolId: row.id, direction: directionSelect.value, target: fromDisplay(meta, value, currencyUnit) });
    } catch (error) {
      toast(error.message);
      return;
    }
    if (isTriggered(alert, row.price)) {
      toast(`قیمت همین الان ${directionSelect.value === 'above' ? 'بالاتر' : 'پایین‌تر'} از این عدد است — هدف دیگری بنویسید`);
      return;
    }
    // درخواست مجوز باید همین لحظهٔ کلیک برود؛ بعد از اولین await، کروم آن را «کنش کاربر» نمی‌داند.
    // اگر از قبل اجازه داده شده باشد، بی‌صدا true برمی‌گردد.
    const permission = requestPermissions({ permissions: ['notifications'] });
    const all = (await readData(STORAGE_KEYS.alerts, [])) ?? [];
    if (all.length >= MAX_ALERTS) {
      toast(`حداکثر ${digits(MAX_ALERTS)} هشدار — چند هشدار قدیمی را پاک کنید`);
      return;
    }
    // اعلان دسکتاپ اختیاری است؛ بدون آن، هشدار هنگام باز بودن تب با پیام داخل صفحه می‌رسد
    const notify = await permission;
    await writeData(STORAGE_KEYS.alerts, [...all, alert]);
    toast(notify ? 'هشدار تنظیم شد — حتی با تب بسته خبرتان می‌کنیم' : 'هشدار تنظیم شد — بدون اجازهٔ اعلان، فقط داخل صفحه خبر می‌دهیم');
  });

  const unsubscribe = onDataChanged(STORAGE_KEYS.alerts, () => renderAlerts());

  const content = el('div', { class: 'symbol' }, [
    head,
    range,
    el('div', { class: 'symbol__section' }, [chart, chartNote]),
    el('div', { class: 'symbol__section' }, [el('h3', { class: 'symbol__title', text: 'هشدار قیمت' }), alertForm, alertList]),
    el('div', { class: 'symbol__foot' }, [
      el('span', { class: 'field__hint', text: row.updatedLabel ? `به‌روزرسانی tgju: ${row.updatedLabel}` : 'منبع: tgju' }),
      onAddToPortfolio &&
        el('button', {
          class: 'btn btn--ghost',
          type: 'button',
          on: {
            click: () => {
              dialog.close();
              onAddToPortfolio(row.id);
            },
          },
        }, [icon('wallet', { size: 15 }), 'افزودن به سبد']),
    ]),
  ]);

  const dialog = openDialog({
    title: meta.label,
    iconName: 'chart',
    content,
    className: 'dialog--symbol',
    onClose: unsubscribe,
  });
  renderAlerts();
  return dialog;
}
