/** آزمون کتابخانه‌های محاسباتی: ماشین‌حساب، تبدیل ارز، میان‌بر موتور، متن، تعطیلات، یادداشت‌ها، جابه‌جایی، بینگ. */
import { evaluate } from '../../src/lib/calc.js';
import { parseConversion, convertToRial, convertFromRial } from '../../src/lib/convert.js';
import { parseBang } from '../../src/lib/bangs.js';
import { normalizeText, matchScore } from '../../src/lib/text.js';
import { upcomingHolidays } from '../../src/lib/holidays.js';
import { toJalali } from '../../src/lib/jalali.js';
import { normalizeNotes, noteTitle, MAX_NOTES } from '../../src/lib/notes.js';
import { moveItem } from '../../src/lib/reorder.js';
import { appendSamples, summarize, HISTORY_BUCKET_MS } from '../../src/lib/history.js';
import { createAlert, evaluateAlerts } from '../../src/lib/alerts.js';
import { valuePortfolio } from '../../src/lib/portfolio.js';
import { describeAqi } from '../../src/lib/aqi.js';
import { toDisplay, fromDisplay, formatPrice } from '../../src/lib/market-format.js';
import { check, summary } from './assert.mjs';

globalThis.chrome ??= { storage: { local: { get: async () => ({}), set: async () => {} } } };
const { normalizeBing } = await import('../../src/services/bing.js');
const { migrateSettings } = await import('../../src/core/storage.js');

// --- ماشین‌حساب ---
const calc = [
  ['2+3*4', 14],
  ['(2+3)*4', 20],
  ['۲ × ۳', 6],
  ['10 ÷ 4', 2.5],
  ['2^3^2', 512],
  ['-2^2', -4],
  ['1,200 + 300', 1500],
  ['۳٫۵*2', 7],
  ['200*15%', 30],
  ['2*(3', null],
  ['123', null],
  ['-5', null],
  ['hello', null],
  ['2+', null],
  ['1/0', null],
  ['alert(1)', null],
];
for (const [input, expected] of calc) {
  const got = evaluate(input);
  check(expected === null ? got === null : Math.abs(got - expected) < 1e-9, `calc ${input} = ${got}`);
}

// --- تبدیل ---
const conv = [
  ['100 دلار', { amount: 100, symbolId: 'price_dollar_rl' }],
  ['۱۰۰ دلار', { amount: 100, symbolId: 'price_dollar_rl' }],
  ['$50', { amount: 50, symbolId: 'price_dollar_rl' }],
  ['2.5 btc', { amount: 2.5, symbolId: 'crypto-bitcoin' }],
  ['۳ سکه به تومان', { amount: 3, symbolId: 'sekee' }],
  ['5 گرم طلا', { amount: 5, symbolId: 'geram18' }],
  ['10 طلای ۲۴', { amount: 10, symbolId: 'geram24' }],
  ['1 بیت‌کوین', { amount: 1, symbolId: 'crypto-bitcoin' }],
  ['100 euro', { amount: 100, symbolId: 'price_eur' }],
  ['5 گرم نقره', { amount: 5, symbolId: 'silver_999' }],
  ['۲ نقره ۹۲۵', { amount: 2, symbolId: 'silver_925' }],
  ['دلار', null],
  ['100 گربه', null],
  ['0 دلار', null],
];
for (const [input, expected] of conv) {
  const got = parseConversion(input);
  check(JSON.stringify(got) === JSON.stringify(expected), `parseConversion "${input}" → ${JSON.stringify(got)}`);
}

const prices = new Map([
  ['price_dollar_rl', 1_000_000],
  ['crypto-bitcoin', 50_000],
  ['bourse', 2_000_000],
]);
const meta = { price_dollar_rl: { unit: 'toman' }, 'crypto-bitcoin': { unit: 'usd' }, bourse: { unit: 'index' } };
check(convertToRial(2, 'price_dollar_rl', prices, meta) === 2_000_000, 'convert 2 dollar → 2M rial');
check(convertToRial(1, 'crypto-bitcoin', prices, meta) === 50_000_000_000, 'convert btc via dollar');
check(convertToRial(1, 'bourse', prices, meta) === null, 'index is not convertible');
check(convertToRial(1, 'price_eur', prices, meta) === null, 'missing price → null');
check(convertFromRial(5_000_000, 'price_dollar_rl', prices, meta) === 5, 'rial → dollar');

// --- میان‌بر موتور ---
check(JSON.stringify(parseBang('!y گربه')) === JSON.stringify({ engineId: 'youtube', query: 'گربه', bang: 'y' }), 'bang prefix');
check(parseBang('حافظ !w')?.engineId === 'wikipedia', 'bang suffix');
check(parseBang('!zz hi') === null, 'unknown bang');
check(parseBang('!y') === null, 'bang without query');
check(parseBang('hello world') === null, 'no bang');

// --- متن ---
check(normalizeText('كتاب‌ها') === normalizeText('کتابها'), 'arabic kaf + zwnj normalize');
check(normalizeText('  علي ') === 'علی', 'arabic yeh + trim');
check(matchScore('تنظ', 'تنظیمات ظاهر') > matchScore('ظاهر', 'تنظیمات ظاهر'), 'prefix match scores higher');
check(matchScore('xyz', 'تنظیمات') === 0, 'no match → 0');
check(matchScore('تم تیره', 'تغییر تم به تیره') > 0, 'all words must match');

// --- تعطیلات پیش رو ---
// ۲۵ اسفند ۱۴۰۴ (۱۶ مارس ۲۰۲۶): ملی‌شدن نفت (۲۹ اسفند، آخرین روز سال) بی‌فاصله به نوروز می‌چسبد
const upcoming = upcomingHolidays(new Date(2026, 2, 16), toJalali, { limit: 2 });
check(upcoming[0]?.title.includes('نفت') && upcoming[0].inDays === 4, `next holiday: ${upcoming[0]?.title} in ${upcoming[0]?.inDays}`);
check(upcoming[0]?.span === 5, `29 esfand + nowruz merged into one 5-day run (span ${upcoming[0]?.span})`);
check(upcoming[1]?.span === 2 && upcoming[1].title.includes('جمهوری'), `then 12–13 farvardin (${upcoming[1]?.title})`);

// --- یادداشت‌ها: مهاجرت و عنوان ---
const legacy = normalizeNotes({ text: 'خرید\nنان و شیر', at: 5 });
check(legacy.version === 2 && legacy.notes.length === 1 && legacy.notes[0].text === 'خرید\nنان و شیر' && legacy.active === legacy.notes[0].id, 'legacy single note migrates intact');
check(normalizeNotes(null).notes.length === 1 && normalizeNotes(null).notes[0].text === '', 'empty storage → one blank note');
check(normalizeNotes({ notes: 'oops' }).notes.length === 1, 'corrupt notes → one blank note');
const two = normalizeNotes({ version: 2, active: 'b', notes: [{ id: 'a', text: 'x', at: 1 }, { id: 'b', text: 'y', at: 2 }] });
check(two.active === 'b' && two.notes.length === 2, 'v2 keeps active note');
check(normalizeNotes({ version: 2, active: 'zz', notes: [{ id: 'a', text: 'x' }] }).active === 'a', 'missing active → first');
check(normalizeNotes({ notes: Array.from({ length: 40 }, (_, i) => ({ id: String(i), text: 'n' })) }).notes.length === MAX_NOTES, 'capped at MAX_NOTES');
check(noteTitle('\n  # فهرست خرید\nنان') === 'فهرست خرید', 'title = first non-empty line, markers stripped');
check(noteTitle('') === 'یادداشت تازه', 'blank title');
check(noteTitle('a'.repeat(60)).endsWith('…') && noteTitle('a'.repeat(60)).length <= 27, 'long title truncated');

// --- جابه‌جایی ---
check(moveItem(['a', 'b', 'c', 'd'], 0, 2).join('') === 'bcad', 'move forward');
check(moveItem(['a', 'b', 'c', 'd'], 3, 0).join('') === 'dabc', 'move backward');
check(moveItem(['a', 'b'], 0, 9).join('') === 'ba', 'clamped target');
const original = ['a', 'b'];
moveItem(original, 0, 1);
check(original.join('') === 'ab', 'does not mutate input');

// --- تصویر روز بینگ ---
const bing = normalizeBing({ images: [{ urlbase: '/th?id=OHR.Wolves_EN-US7105521535', title: 'T', copyright: 'C', copyrightlink: 'https://www.bing.com/search?q=x', startdate: '20261023' }] });
check(bing.url1080 === 'https://www.bing.com/th?id=OHR.Wolves_EN-US7105521535_1920x1080.jpg' && bing.urlUhd.endsWith('_UHD.jpg'), 'bing image urls');
check(bing.link === 'https://www.bing.com/search?q=x', 'bing link kept when on bing.com');
check(normalizeBing({ images: [{ urlbase: '/a', copyrightlink: 'https://evil.example/' }] }).link === null, 'foreign link dropped');
let threw = 0;
for (const bad of [{}, { images: [] }, { images: [{ urlbase: 'https://evil/x' }] }, { images: [{ urlbase: '/x"), url(evil' }] }]) {
  try {
    normalizeBing(bad);
  } catch {
    threw += 1;
  }
}
check(threw === 4, 'invalid / CSS-injecting payloads rejected');

// --- مهاجرت تنظیمات: نقره به نوار نرخ کاربران قبلی ---
const m1 = migrateSettings({ market: { symbols: ['price_dollar_rl', 'sekee', 'geram18', 'crypto-bitcoin'] } });
check(m1.changed && m1.settings.version === 3, 'v1 settings migrate to latest');
check(m1.settings.update.repo === 'AmirGhl/Yar', 'empty repo migrates to the official repo');
check(migrateSettings({ version: 2, update: { repo: 'me/fork' } }).settings.update.repo === 'me/fork', 'user-chosen repo is kept');
check(m1.settings.market.symbols.join() === 'price_dollar_rl,sekee,geram18,silver_999,crypto-bitcoin', `silver inserted after gold: ${m1.settings.market.symbols}`);
const m2 = migrateSettings(m1.settings);
check(!m2.changed, 'migration runs once');
const m3 = migrateSettings({ version: 1, market: { symbols: ['silver_999', 'price_eur'] } });
check(m3.settings.market.symbols.join() === 'silver_999,price_eur', 'no duplicate silver');
const m4 = migrateSettings({ appearance: { theme: 'light' } });
check(m4.settings.version === 3 && !m4.settings.market, 'settings without market untouched (defaults fill in)');

// --- تاریخچهٔ نرخ ---
const H = HISTORY_BUCKET_MS;
const t0 = 1_000 * H;
let hist = appendSamples({}, [{ id: 'd', price: 10 }], t0);
hist = appendSamples(hist, [{ id: 'd', price: 11 }], t0 + H / 2); // همان ساعت → جایگزین
check(hist.d.length === 1 && hist.d[0][1] === 11, 'same hour bucket replaces last sample');
hist = appendSamples(hist, [{ id: 'd', price: 12 }, { id: 'x', price: NaN }], t0 + H * 1.2);
check(hist.d.length === 2 && !hist.x, 'new hour appends; NaN ignored');
const aged = appendSamples(hist, [{ id: 'd', price: 13 }], t0 + 8 * 24 * H);
check(aged.d.length === 1 && aged.d[0][1] === 13, 'points older than 7 days are trimmed');
check(summarize([[1, 10], [2, 15], [3, 12]]).changePercent === 20 && summarize([[1, 1]]) === null, 'summarize change and short series');

// --- هشدار قیمت ---
const up = createAlert({ symbolId: 'd', direction: 'above', target: 100 }, 1);
const down = createAlert({ symbolId: 'd', direction: 'below', target: 50 }, 1);
const r1 = evaluateAlerts([up, down], new Map([['d', 99]]), 5);
check(r1.fired.length === 0 && r1.alerts.every((a) => a.active), 'no alert below target');
const r2 = evaluateAlerts(r1.alerts, new Map([['d', 100]]), 6);
check(r2.fired.length === 1 && r2.fired[0].id === up.id && r2.fired[0].firedPrice === 100 && !r2.alerts[0].active, 'above fires at target and disarms');
const r3 = evaluateAlerts(r2.alerts, new Map([['d', 120]]), 7);
check(r3.fired.length === 0, 'one-shot: does not fire twice');
check(evaluateAlerts(r2.alerts, new Map([['d', 40]]), 8).fired[0]?.id === down.id, 'below fires');
check(evaluateAlerts([up], new Map(), 9).fired.length === 0, 'missing price never fires');
let invalid = 0;
for (const bad of [{ symbolId: 'd', direction: 'x', target: 1 }, { symbolId: 'd', direction: 'above', target: 0 }, { direction: 'above', target: 5 }]) {
  try {
    createAlert(bad);
  } catch {
    invalid += 1;
  }
}
check(invalid === 3, 'invalid alerts rejected');

// --- سبد دارایی ---
const pMeta = { price_dollar_rl: { unit: 'toman' }, sekee: { unit: 'toman' }, 'crypto-bitcoin': { unit: 'usd' } };
const pRows = new Map([
  ['price_dollar_rl', { price: 1_000_000, changePercent: 0 }],
  ['sekee', { price: 50_000_000, changePercent: 25 }],
  ['crypto-bitcoin', { price: 100, changePercent: 0 }],
]);
const pv = valuePortfolio(
  [
    { id: '1', symbolId: 'sekee', amount: 2, buyPrice: 40_000_000 },
    { id: '2', symbolId: 'price_dollar_rl', amount: 10 },
    { id: '3', symbolId: 'crypto-bitcoin', amount: 0.5 },
    { id: '4', symbolId: 'price_eur', amount: 1 },
  ],
  pRows,
  pMeta,
);
check(pv.total === 100_000_000 + 10_000_000 + 50_000_000, `portfolio total ${pv.total}`);
check(Math.abs(pv.dayChange - 20_000_000) < 1e-6, `day change from 25% sekee (${pv.dayChange})`);
check(pv.profit === 20_000_000 && Math.abs(pv.items[0].profitPercent - 25) < 1e-9, 'profit from buy price');
check(pv.missing.join() === 'price_eur' && pv.items.at(-1).value === null, 'unpriced holding reported, sorted last');
check(Math.abs(pv.items.reduce((sum, item) => sum + item.share, 0) - 1) < 1e-9, 'shares sum to 1');

// --- کیفیت هوا ---
check(describeAqi(42).id === 'good' && describeAqi(136).id === 'sensitive' && describeAqi(301).id === 'hazardous', 'aqi levels');
check(describeAqi(50).id === 'good' && describeAqi(51).id === 'moderate' && describeAqi(-1) === null, 'aqi boundaries');

// --- قالب قیمت ---
check(toDisplay({ unit: 'toman' }, 4_943_900, 'toman') === 494_390 && toDisplay({ unit: 'usd' }, 54, 'toman') === 54, 'toDisplay rial→toman, usd untouched');
check(fromDisplay({ unit: 'toman' }, 494_390, 'toman') === 4_943_900 && fromDisplay({ unit: 'toman' }, 5, 'rial') === 5, 'fromDisplay');
check(formatPrice({ unit: 'usd' }, 53.96, { persianDigits: false }) === '$53.96' && formatPrice({ unit: 'toman' }, 4_943_900, { persianDigits: false }) === '494,390', 'formatPrice');

summary('libs');
