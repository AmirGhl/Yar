/**
 * کلیدواژهٔ «yar» در نوار آدرس کروم: `yar` + فاصله، بعد:
 *   yar ۲۵×۴           → حساب، همان‌جا در پیشنهاد
 *   yar ۱۰۰ دلار        → تبدیل به تومان با نرخ زنده
 *   yar کار خرید نان    → افزودن به کارها (یا: todo …)
 *   yar یادداشت …       → یادداشت تازه (یا: note …)
 *   yar هر چیز دیگر     → جست‌وجو با موتور پیش‌فرض کاربر (!y و بقیه هم کار می‌کنند)
 */

import { evaluate } from '../lib/calc.js';
import { parseConversion, convertToRial, DOLLAR_ID } from '../lib/convert.js';
import { parseBang } from '../lib/bangs.js';
import { formatNumber } from '../lib/format.js';
import { SEARCH_ENGINES, MARKET_SYMBOLS } from '../core/defaults.js';
import { getMarket } from '../services/market.js';
import { addTodo, addNote } from './user-data.js';
import { flashBadge } from './badge.js';

const META = Object.fromEntries(MARKET_SYMBOLS.map((item) => [item.id, item]));
const TODO_PREFIX = /^(?:کار|todo|t)\s+(.+)$/i;
const NOTE_PREFIX = /^(?:یادداشت|note|n)\s+(.+)$/i;

/** متن پیشنهادهای نوار آدرس XML است؛ هر متن کاربر باید گریز داده شود. */
export function escapeXml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}

async function settings() {
  return (await chrome.storage.local.get('yar:settings'))['yar:settings'] ?? {};
}

/**
 * تفسیر عبارت — بدون اثر جانبی، برای پیشنهاد و برای اجرا.
 * @returns {Promise<{kind:'todo'|'note'|'calc'|'convert'|'search', text:string, description:string, url?:string}>}
 */
export async function interpret(input) {
  const text = input.trim();
  const prefs = await settings();

  const todo = TODO_PREFIX.exec(text);
  if (todo) return { kind: 'todo', text: todo[1], description: `افزودن به کارهای یار: <match>${escapeXml(todo[1])}</match>` };
  const note = NOTE_PREFIX.exec(text);
  if (note) return { kind: 'note', text: note[1], description: `ذخیره در یادداشت‌های یار: <match>${escapeXml(note[1])}</match>` };

  const value = evaluate(text);
  if (value != null) {
    const result = formatNumber(Math.round(value * 1e10) / 1e10, { maximumFractionDigits: 10 });
    return { kind: 'calc', text, description: `<match>= ${escapeXml(result)}</match> <dim>— ماشین‌حساب یار</dim>` };
  }

  const conversion = parseConversion(text);
  if (conversion) {
    try {
      const market = await getMarket([conversion.symbolId, DOLLAR_ID]);
      const prices = new Map(market.rows.map((row) => [row.id, row.price]));
      const rial = convertToRial(conversion.amount, conversion.symbolId, prices, META);
      if (rial != null) {
        const asRial = prefs.market?.currencyUnit === 'rial';
        const shown = formatNumber(asRial ? rial : rial / 10);
        return {
          kind: 'convert',
          text,
          description: `<match>${escapeXml(shown)} ${asRial ? 'ریال' : 'تومان'}</match> <dim>— ${escapeXml(text)}${market.stale ? ' (آفلاین)' : ''}</dim>`,
        };
      }
    } catch {
      // بدون نرخ، همان جست‌وجوی معمولی
    }
  }

  const bang = parseBang(text);
  const engine =
    SEARCH_ENGINES.find((item) => item.id === (bang?.engineId ?? prefs.search?.engine)) ?? SEARCH_ENGINES[0];
  const query = bang ? bang.query : text;
  return {
    kind: 'search',
    text: query,
    url: engine.url.replace('%s', encodeURIComponent(query)),
    description: `جست‌وجوی <match>${escapeXml(query)}</match> در ${escapeXml(engine.label)}`,
  };
}

async function onInputChanged(text, suggest) {
  if (!text.trim()) return;
  const result = await interpret(text);
  chrome.omnibox.setDefaultSuggestion({ description: result.description });
  // دو میان‌بر همیشگی زیر پیشنهاد اصلی، تا کاربر بداند این کلیدواژه چه کارهایی بلد است
  const extras = [];
  if (result.kind !== 'todo') extras.push({ content: `کار ${text}`, description: `افزودن به کارها: <match>${escapeXml(text)}</match>` });
  if (result.kind !== 'note') extras.push({ content: `یادداشت ${text}`, description: `ذخیره در یادداشت‌ها: <match>${escapeXml(text)}</match>` });
  suggest(extras);
}

async function onInputEntered(text, disposition) {
  const result = await interpret(text);
  if (result.kind === 'todo') {
    await addTodo(result.text);
    await flashBadge();
    return;
  }
  if (result.kind === 'note') {
    await addNote(result.text);
    await flashBadge();
    return;
  }
  // حساب و تبدیل جواب را در خود پیشنهاد دیده‌اند؛ Enter یعنی «بیشتر بگو» → جست‌وجو
  const fallback = result.url ?? (await interpret(`!g ${text}`)).url;
  const url = result.kind === 'search' ? result.url : fallback;
  if (disposition === 'currentTab') await chrome.tabs.update({ url });
  else await chrome.tabs.create({ url, active: disposition === 'newForegroundTab' });
}

export function listenOmnibox() {
  if (!chrome.omnibox) return;
  chrome.omnibox.setDefaultSuggestion({ description: 'یار: حساب، تبدیل ارز، «کار …»، «یادداشت …» یا جست‌وجو' });
  chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    onInputChanged(text, suggest).catch(() => {});
  });
  chrome.omnibox.onInputEntered.addListener((text, disposition) => {
    onInputEntered(text, disposition).catch(() => flashBadge('×', '#dc2626'));
  });
}
