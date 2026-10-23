/** پاپ‌آپ: نگاه سریع به ساعت، تاریخ، آب‌وهوا و نرخ‌ها + افزودن کار. */

import { $, el, icon } from '../core/dom.js';
import { getSettings, readData, writeData, STORAGE_KEYS } from '../core/storage.js';
import { applyAppearance } from '../core/theme.js';
import { MESSAGE, send } from '../core/messaging.js';
import { toFaDigits, pad2, formatNumber, rialToToman } from '../lib/format.js';
import { toJalali, persianWeekday, JALALI_MONTHS, JALALI_WEEKDAYS } from '../lib/jalali.js';
import { getOccasions } from '../lib/holidays.js';
import { MARKET_SYMBOLS } from '../core/defaults.js';
import { weatherScene, sceneNameFor } from '../ui/weather-art.js';
import { isNewer } from '../lib/versions.js';

const LABELS = Object.fromEntries(MARKET_SYMBOLS.map((item) => [item.id, item]));
const settings = await getSettings();
const digits = (value) => (settings.appearance.persianDigits ? toFaDigits(value) : String(value));

applyAppearance(settings);

const root = $('#root');

function heroBlock() {
  const now = new Date();
  const jalali = toJalali(now);
  const weekday = persianWeekday(now);
  const { events } = getOccasions(jalali, now, { weekday });

  return el('section', { class: 'popup__hero' }, [
    el('div', { class: 'popup__time tnum', text: digits(`${pad2(now.getHours())}:${pad2(now.getMinutes())}`) }),
    el('div', {
      class: 'popup__date',
      text: `${JALALI_WEEKDAYS[weekday]} ${digits(jalali.jd)} ${JALALI_MONTHS[jalali.jm - 1]} ${digits(jalali.jy)}`,
    }),
    events.length && el('div', { class: 'popup__sub', text: events.map((event) => event.title).join('، ') }),
  ]);
}

function weatherTile() {
  const glyph = el('span', { class: 'popup__wx' }, [weatherScene('cloud', { size: 26 })]);
  const tile = el('div', { class: 'popup__tile' }, [
    glyph,
    el('div', {}, [el('b', { text: '…' }), el('small', { text: settings.weather.city.name })]),
  ]);

  const city = settings.weather.city;
  send(MESSAGE.weather, {
    latitude: city.latitude,
    longitude: city.longitude,
    timeZone: city.timeZone,
    unit: settings.weather.unit,
  })
    .then((result) => {
      const { current } = result.data;
      const temperature = Math.round(current.temperature);
      glyph.replaceChildren(weatherScene(sceneNameFor(current.code ?? 0, current.isDay), { size: 26 }));
      tile.querySelector('b').textContent = `${digits(temperature)}${settings.weather.unit === 'fahrenheit' ? '°F' : '°C'}`;
    })
    .catch(() => {
      tile.querySelector('b').textContent = '—';
      tile.querySelector('small').textContent = 'آب‌وهوا در دسترس نیست';
    });

  return tile;
}

/** نوار «نسخهٔ تازه» — فقط اگر سرویس‌ورکر نسخهٔ جدیدتری پیدا کرده و کاربر نادیده‌اش نگرفته. */
function updateBanner() {
  const banner = el('a', { class: 'popup__update', hidden: true, target: '_blank', rel: 'noopener noreferrer' });
  readData('yar:update').then((state) => {
    const latest = state?.latest;
    if (!latest || !isNewer(latest.version, chrome.runtime.getManifest().version) || state.dismissedVersion === latest.version) return;
    banner.href = latest.url;
    banner.replaceChildren(icon('sparkle', { size: 14 }), `نسخهٔ تازهٔ یار آماده است: ${digits(latest.version)}`);
    banner.hidden = false;
  });
  return banner;
}

function marketBlock() {
  const list = el('div', { class: 'market__list' });
  const section = el('section', { class: 'popup__section' }, [el('h2', { text: 'بازار' }), list]);
  list.append(el('div', { class: 'skeleton', style: { height: '2.5rem' } }));

  send(MESSAGE.market, { symbols: settings.market.symbols.slice(0, 3) })
    .then((result) => {
      if (!result.rows.length) {
        list.replaceChildren(el('span', { class: 'field__hint', text: 'نمادی انتخاب نشده است.' }));
        return;
      }
      list.replaceChildren(
        ...result.rows.map((row) => {
          const meta = LABELS[row.id];
          const isForeign = meta?.unit === 'usd' || meta?.unit === 'index';
          const value = isForeign
            ? formatNumber(row.price, { persianDigits: settings.appearance.persianDigits, maximumFractionDigits: 2 })
            : formatNumber(
                settings.market.currencyUnit === 'toman' ? rialToToman(row.price) : row.price,
                { persianDigits: settings.appearance.persianDigits },
              );
          const direction = row.direction > 0 ? 'up' : row.direction < 0 ? 'down' : 'flat';
          return el('div', { class: 'market__row' }, [
            el('span', { class: 'market__name', text: meta?.label ?? row.id }),
            el('span', { class: 'market__price tnum', text: value }),
            el('span', { class: 'market__delta tnum', 'data-dir': direction }, [
              direction !== 'flat' && icon(direction === 'up' ? 'arrowUp' : 'arrowDown', { size: 11 }),
              `${formatNumber(Math.abs(row.changePercent), { persianDigits: settings.appearance.persianDigits, maximumFractionDigits: 2 })}٪`,
            ]),
          ]);
        }),
      );
    })
    .catch((error) => {
      list.replaceChildren(el('span', { class: 'field__hint', text: error.message }));
    });

  return section;
}

function quickTodo() {
  const input = el('input', { class: 'input', type: 'text', placeholder: 'کار تازه…', 'aria-label': 'کار تازه' });
  const status = el('span', { class: 'field__hint', 'aria-live': 'polite' });

  const form = el('form', { class: 'todo__form' }, [
    input,
    el('button', { class: 'btn btn--primary', type: 'submit', 'aria-label': 'افزودن' }, [icon('plus', { size: 16 })]),
  ]);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const items = (await readData(STORAGE_KEYS.todos)) ?? [];
    items.push({ id: crypto.randomUUID(), text, done: false, at: Date.now() });
    await writeData(STORAGE_KEYS.todos, items);
    input.value = '';
    status.textContent = 'به فهرست کارها اضافه شد';
  });

  return el('section', { class: 'popup__section' }, [el('h2', { text: 'کار تازه' }), form, status]);
}

root.replaceChildren(
  updateBanner(),
  heroBlock(),
  el('div', { class: 'popup__strip' }, [weatherTile()]),
  marketBlock(),
  quickTodo(),
  el('div', { class: 'popup__foot' }, [
    el('button', {
      class: 'btn',
      type: 'button',
      text: 'باز کردن یار',
      on: {
        click: () => {
          chrome.tabs.create({ url: chrome.runtime.getURL('src/newtab/index.html') });
          window.close();
        },
      },
    }),
  ]),
);
