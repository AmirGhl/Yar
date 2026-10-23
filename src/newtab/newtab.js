/**
 * سرهم‌بندی صفحهٔ تب جدید.
 *
 * چهار ناحیه دارد و بس: ستون کناری (امروز + تقویم)، وسط (جست‌وجو + میان‌برها)،
 * پنل زبانه‌دار (کارها، یادداشت، اخبار، نشان‌ها، تایمر، مبدل) و نوار نرخ‌ها.
 * این فایل فقط می‌سازد و می‌چیند؛ منطق کاری داخلش نیست.
 */

import { $, el, icon } from '../core/dom.js';
import { getSettings, updateSettings, onSettingsChanged, onDataChanged, STORAGE_KEYS } from '../core/storage.js';
import { applyAppearance, watchSystemTheme, setDailyWallpaper, DAILY_WALLPAPER_ID } from '../core/theme.js';
import { MESSAGE, send } from '../core/messaging.js';
import { prefersReducedMotion, revealStagger } from '../core/motion.js';
import { WIDGET_REGISTRY, MARKET_SYMBOLS } from '../core/defaults.js';
import { createSettingsDrawer } from '../ui/settings/drawer.js';
import { createTabPanel } from '../ui/tabs.js';
import { iconButton } from '../ui/card.js';
import { errorState } from '../ui/states.js';
import { openPalette } from '../ui/palette.js';
import { buildPaletteSources } from '../ui/palette-sources.js';
import { openShortcutHelp } from '../ui/shortcut-help.js';
import { needsOnboarding, openOnboarding } from '../ui/onboarding.js';
import { watchUpdates } from '../ui/update-notice.js';
import { toast } from '../ui/toast.js';

import { createToday } from '../widgets/today.js';
import { createCalendar } from '../widgets/calendar.js';
import { createSearch } from '../widgets/search.js';
import { createShortcuts } from '../widgets/shortcuts.js';
import { createTodo } from '../widgets/todo.js';
import { createNotes } from '../widgets/notes.js';
import { createNews } from '../widgets/news.js';
import { createBookmarks } from '../widgets/bookmarks.js';
import { createTimer } from '../widgets/timer.js';
import { createConverter } from '../widgets/converter.js';
import { createPortfolio } from '../widgets/portfolio.js';
import { createTicker } from '../widgets/ticker.js';

const FACTORIES = {
  today: createToday,
  calendar: createCalendar,
  search: createSearch,
  shortcuts: createShortcuts,
  todo: createTodo,
  notes: createNotes,
  news: createNews,
  bookmarks: createBookmarks,
  timer: createTimer,
  converter: createConverter,
  portfolio: createPortfolio,
  market: createTicker,
};

const META = Object.fromEntries(WIDGET_REGISTRY.map((widget) => [widget.id, widget]));

const slots = {
  side: $('#slot-side'),
  hero: $('#slot-hero'),
  ticker: $('#slot-ticker'),
};
const panelSlot = $('#slot-panel');
const tools = $('#rail-tools');
const credit = $('#rail-credit');

let settings = await getSettings();
/** @type {Map<string, object>} نمونهٔ زندهٔ هر ویجت، برای پالت فرمان */
let instances = new Map();
let observers = [];
let panel = null;
const badges = new Map();

applyAppearance(settings);

const usesDailyWallpaper = () =>
  settings.appearance.wallpaper === DAILY_WALLPAPER_ID && !settings.appearance.customWallpaper;

/**
 * تصویر روز بینگ: نشانی تازه از سرویس‌ورکر (کش ۶ ساعته) + اعتبار عکاس در ریل بالا.
 * شکستش هیچ‌وقت صفحه را خالی نمی‌کند — آخرین تصویر یا شیب پیش‌فرض می‌ماند.
 */
async function syncDailyWallpaper() {
  if (!usesDailyWallpaper()) {
    credit.hidden = true;
    return;
  }
  try {
    const { data } = await send(MESSAGE.bing);
    if (!usesDailyWallpaper()) return; // کاربر در این فاصله پس‌زمینه را عوض کرده
    const needsUhd = window.screen.width * window.devicePixelRatio > 1920;
    setDailyWallpaper(needsUhd ? data.urlUhd : data.url1080);
    applyAppearance(settings);
    credit.textContent = data.title || 'تصویر روز بینگ';
    credit.title = data.copyright;
    if (data.link) credit.href = data.link;
    else credit.removeAttribute('href');
    credit.hidden = false;
  } catch {
    credit.hidden = true;
  }
}

const drawer = createSettingsDrawer({
  settings,
  apply: (next) => {
    applyAppearance(next);
    syncDailyWallpaper();
  },
  rebuild: () => build(),
});

/**
 * ترتیب ویجت‌ها. ترتیب ذخیره‌شده مقدم است، ولی ویجتی که در نسخهٔ تازه اضافه شده
 * و در ترتیب قدیمی کاربر نیست، باید باز هم سر جای پیش‌فرضش ظاهر شود.
 */
function widgetOrder() {
  const stored = settings.layout.order.filter((id) => FACTORIES[id]);
  const missing = WIDGET_REGISTRY.map((widget) => widget.id).filter((id) => FACTORIES[id] && !stored.includes(id));
  return [...stored, ...missing];
}

function teardown() {
  instances.forEach((instance) => instance.destroy?.());
  instances = new Map();
  observers.forEach((observer) => observer.disconnect());
  observers = [];
  panel?.destroy();
  panel = null;
}

/** ناحیه‌ای که محتوایش از قابش بیرون زده، لبه‌های محوشونده می‌گیرد. */
function markScrollable(node) {
  const update = () => node.classList.toggle('is-scrollable', node.scrollHeight > node.clientHeight + 1);
  update();
  const observer = new ResizeObserver(update);
  observer.observe(node);
  for (const child of node.children) observer.observe(child);
  observers.push(observer);
}

/** از جزئیات یک نماد: رفتن به زبانهٔ سبد با همان نماد آماده. */
function addToPortfolio(symbolId) {
  if (!panel || !settings.layout.visible.portfolio) {
    drawer.open('widgets');
    return;
  }
  panel.select('portfolio');
  ensureWidget('portfolio')?.prefill?.(symbolId);
}

function setBadge(id, text) {
  badges.set(id, text);
  panel?.setBadge(id, text);
}

/**
 * ساختن یک ویجت، جدا از بقیه: اگر یکی خطا بدهد، فقط جای خودش یک کارت خطا می‌نشیند
 * و بقیهٔ صفحه سالم می‌ماند — نه اینکه کل تب جدید سفید شود.
 */
function createWidget(id, context) {
  const meta = META[id];
  let instance;
  try {
    instance = FACTORIES[id](context);
  } catch (error) {
    console.error(`[yar] widget "${id}" failed`, error);
    const card = el('section', { class: 'card widget' }, [
      errorState({
        message: `«${meta.label}» بارگذاری نشد. بقیهٔ صفحه سالم است.`,
        retryLabel: 'ساخت دوباره',
        onRetry: () => build(),
      }),
    ]);
    instance = { element: card };
  }
  instance.element.dataset.widget = id;
  if (meta.slot === 'panel') instance.element.classList.add('card--bare');
  else if (meta.grow) instance.element.classList.add('card--grow');
  instances.set(id, instance);
  return instance;
}

/**
 * زبانه‌هایی که تا دیده نشوند ساخته نمی‌شوند: یا شبکه می‌خواهند (اخبار، نرخ‌ها)
 * یا APIهای مرورگر (نشان‌ها). کارها و تایمر همیشه زنده‌اند — یکی عدد روی زبانه
 * دارد و دیگری باید پایان جلسه را حتی در زبانهٔ پنهان بشنود. یادداشت ارزان است و
 * پالت فرمان در متنش می‌گردد.
 */
const LAZY_PANEL = new Set(['news', 'bookmarks', 'converter', 'portfolio']);

/** نمونهٔ یک ویجت، و اگر زبانه‌اش هنوز ساخته نشده، همین حالا ساختنش. */
function ensureWidget(id) {
  if (!instances.has(id)) panel?.ensureLoaded(id);
  return instances.get(id);
}

function build() {
  teardown();
  Object.values(slots).forEach((node) => node.replaceChildren());
  panelSlot.replaceChildren();

  const context = { settings, openSettings: (group) => drawer.open(group), setBadge, addToPortfolio };
  const isVisible = (id) => settings.layout.visible[id] !== false;
  const panelTabs = [];

  for (const id of widgetOrder()) {
    if (!isVisible(id)) continue;
    const meta = META[id];

    if (meta.slot === 'panel') {
      const tab = { id, label: meta.tabLabel ?? meta.label, icon: meta.icon ?? 'dot' };
      if (LAZY_PANEL.has(id)) tab.load = () => createWidget(id, context).element;
      else tab.element = createWidget(id, context).element;
      panelTabs.push(tab);
      continue;
    }

    slots[meta.slot].append(createWidget(id, context).element);
  }

  if (panelTabs.length) {
    panel = createTabPanel({
      tabs: panelTabs,
      active: settings.layout.panelTab,
      reduced: prefersReducedMotion(settings.appearance.reduceMotion),
      onChange: (id) => {
        if (settings.layout.panelTab === id) return;
        settings.layout.panelTab = id;
        updateSettings({ layout: { panelTab: id } });
      },
    });
    panelSlot.append(panel.element);
    panel.refresh();
    badges.forEach((text, id) => panel.setBadge(id, text));
  }

  const anything = [...slots.side.children, ...slots.hero.children, ...panelSlot.children].length;
  if (!anything) {
    slots.hero.append(
      el('div', { class: 'card' }, [
        el('div', { class: 'state' }, [
          icon('grid', { size: 22 }),
          el('p', { class: 'state__title', text: 'همهٔ بخش‌ها خاموش‌اند' }),
          el('p', { text: 'از تنظیمات، چیزهایی را که می‌خواهید ببینید روشن کنید.' }),
          el('button', {
            class: 'btn btn--primary',
            type: 'button',
            text: 'باز کردن تنظیمات',
            on: { click: () => drawer.open('widgets') },
          }),
        ]),
      ]),
    );
  }

  // ناحیه‌های خالی نباید جای گرید را اشغال کنند
  slots.side.classList.toggle('is-empty', !slots.side.children.length);
  panelSlot.classList.toggle('is-empty', !panelSlot.children.length);
  slots.ticker.classList.toggle('is-empty', !slots.ticker.children.length);

  markScrollable(slots.side);
  revealStagger([...slots.side.children, ...panelSlot.children, ...slots.ticker.children], {
    reduced: prefersReducedMotion(settings.appearance.reduceMotion),
  });
}

async function togglePrivacy() {
  const next = !settings.appearance.privacy;
  Object.assign(settings, await updateSettings({ appearance: { privacy: next } }));
  applyAppearance(settings);
  buildTools();
  toast(next ? 'حالت پنهان روشن شد — اعداد و یادداشت‌ها محو شدند' : 'حالت پنهان خاموش شد');
}

async function toggleTheme() {
  const next = settings.appearance.theme === 'light' ? 'dark' : 'light';
  Object.assign(settings, await updateSettings({ appearance: { theme: next } }));
  applyAppearance(settings);
  buildTools();
}

const selectTab = (id) => {
  if (!panel) return false;
  panel.select(id, { focus: false });
  return true;
};

function showPalette() {
  openPalette({
    sources: buildPaletteSources({
      settings,
      instances: () => instances,
      openSettings: (group) => drawer.open(group),
      selectTab,
      toggleTheme,
      togglePrivacy,
      showHelp: openShortcutHelp,
    }),
  });
}

/** نسخهٔ تازه در دسترس است؟ دکمهٔ برجستهٔ ریل بالا تا وقتی نصب یا نادیده گرفته شود. */
let updateButton = null;

function buildTools() {
  const themeToggle = iconButton(
    settings.appearance.theme === 'light' ? 'moon' : 'sun',
    'تغییر تم روشن و تیره',
    toggleTheme,
  );

  tools.replaceChildren(
    ...(updateButton ? [updateButton] : []),
    iconButton('command', 'پالت فرمان (Ctrl+K)', showPalette),
    iconButton('keyboard', 'میان‌برهای صفحه‌کلید (?)', openShortcutHelp),
    iconButton(settings.appearance.privacy ? 'eyeOff' : 'eye', 'حالت پنهان (H)', togglePrivacy, { pressed: settings.appearance.privacy }),
    themeToggle,
    iconButton('settings', 'تنظیمات', () => drawer.open()),
  );
}

const isTyping = () =>
  ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
const dialogOpen = () => Boolean(document.querySelector('.dialog, .drawer, .prompt'));

document.addEventListener('keydown', (event) => {
  // Ctrl+K حتی وسط تایپ هم کار می‌کند — همان قراردادی که بقیهٔ وب دارد
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
    if (dialogOpen()) return;
    event.preventDefault();
    showPalette();
    return;
  }

  if (isTyping() || dialogOpen() || event.metaKey || event.ctrlKey || event.altKey) return;

  // «/» فوکوس را به جست‌وجو می‌برد، مثل بقیهٔ وب
  if (event.key === '/' && instances.get('search')) {
    event.preventDefault();
    instances.get('search').focus();
    return;
  }
  if (event.key === '?') {
    event.preventDefault();
    openShortcutHelp();
    return;
  }
  // «h» حالت پنهان را عوض می‌کند (روی صفحه‌کلید فارسی همان کلید «ا» است)
  if (event.key === 'h' || event.key === 'ا') {
    event.preventDefault();
    togglePrivacy();
    return;
  }
  // «t» تم را عوض می‌کند
  if (event.key === 't' || event.key === 'ف') {
    event.preventDefault();
    toggleTheme();
    return;
  }
  // «۱» تا «۹» زبانه‌های پنل کناری را عوض می‌کند (ارقام فارسی هم)
  const digit = /^[1-9]$/.test(event.key) ? Number(event.key) : '۱۲۳۴۵۶۷۸۹'.indexOf(event.key) + 1;
  if (panel && digit > 0) {
    const target = [...panelSlot.querySelectorAll('.tabs__tab')][digit - 1];
    if (target) {
      event.preventDefault();
      target.click();
    }
  }
});

// هشداری که همین الان زده شد، اگر تب باز است داخل صفحه هم دیده شود (حتی بدون مجوز اعلان)
const SYMBOL_LABELS = Object.fromEntries(MARKET_SYMBOLS.map((item) => [item.id, item.label]));
const announcedAlerts = new Set();
onDataChanged(STORAGE_KEYS.alerts, (alerts) => {
  for (const alert of Array.isArray(alerts) ? alerts : []) {
    const key = `${alert.id}:${alert.firedAt}`;
    if (!alert.firedAt || Date.now() - alert.firedAt > 2 * 60 * 1000 || announcedAlerts.has(key)) continue;
    announcedAlerts.add(key);
    const label = SYMBOL_LABELS[alert.symbolId] ?? alert.symbolId;
    toast(`هشدار قیمت: ${label} ${alert.direction === 'above' ? 'از هدف بالاتر رفت' : 'از هدف پایین‌تر آمد'}`, { duration: 9000 });
  }
});

onSettingsChanged((next) => {
  Object.assign(settings, next);
  applyAppearance(settings);
  syncDailyWallpaper();
});

watchSystemTheme(
  () => settings,
  () => applyAppearance(settings),
);

buildTools();
build();
syncDailyWallpaper();

watchUpdates({
  settings,
  onAvailabilityChange: (available, open) => {
    const had = Boolean(updateButton);
    updateButton = available
      ? el('button', { class: 'rail__update', type: 'button', title: 'نسخهٔ تازهٔ یار آماده است', on: { click: open } }, [
          icon('sparkle', { size: 14 }),
          'نسخهٔ تازه',
        ])
      : null;
    if (had || available) buildTools();
  },
});

// نصب تازه: خوش‌آمد یک‌صفحه‌ای؛ بعد از «شروع»، صفحه با نام و شهر کاربر دوباره ساخته می‌شود
if (await needsOnboarding()) {
  openOnboarding({
    settings,
    onDone: (next) => {
      // «بعداً»: تمی که فقط برای پیش‌نمایش عوض شده بود برمی‌گردد
      if (!next) {
        applyAppearance(settings);
        return;
      }
      Object.assign(settings, next);
      applyAppearance(settings);
      buildTools();
      build();
    },
  });
}
