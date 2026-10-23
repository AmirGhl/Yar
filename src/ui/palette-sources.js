/**
 * منبع‌های پالت فرمان. هر منبع یک گروه از نتیجه‌ها می‌سازد؛ ترتیب این آرایه
 * ترتیب گروه‌ها روی صفحه است: اول پاسخ فوری، بعد کارهای صفحه، بعد سایت‌ها.
 */

import { MESSAGE, send } from '../core/messaging.js';
import { readData, STORAGE_KEYS } from '../core/storage.js';
import { SEARCH_ENGINES, WIDGET_REGISTRY } from '../core/defaults.js';
import { matchScore } from '../lib/text.js';
import { parseBang } from '../lib/bangs.js';
import { quickAnswer } from './answers.js';
import { urlFor } from '../widgets/search.js';
import { toast } from './toast.js';

const SETTINGS_GROUPS = [
  ['appearance', 'ظاهر', 'تم پس‌زمینه رنگ شیشه'],
  ['general', 'عمومی', 'نام سلام ثانیه'],
  ['search', 'جست‌وجو', 'موتور پیشنهاد'],
  ['weather', 'شهر و آب‌وهوا', 'شهر دما موقعیت'],
  ['market', 'بازار', 'ارز طلا نماد'],
  ['news', 'اخبار', 'خبرخوان منبع rss'],
  ['timer', 'تایمر تمرکز', 'پومودورو صدا اعلان'],
  ['widgets', 'ویجت‌ها', 'بخش نمایش پنهان'],
  ['backup', 'پشتیبان‌گیری', 'خروجی ورودی بازیابی'],
  ['updates', 'به‌روزرسانی', 'نسخه آپدیت گیت‌هاب update github'],
];

/**
 * @param {{settings:object, instances:()=>Map<string,object>, openSettings:(group?:string)=>void,
 *          selectTab:(id:string)=>boolean, toggleTheme:()=>void, showHelp:()=>void}} context
 * @returns {import('./palette.js').PaletteSource[]}
 */
export function buildPaletteSources({ settings, instances, openSettings, selectTab, toggleTheme, togglePrivacy, showHelp }) {
  const engine = () => SEARCH_ENGINES.find((item) => item.id === settings.search.engine) ?? SEARCH_ENGINES[0];

  const answers = {
    group: 'پاسخ فوری',
    minQuery: 2,
    items: async (query) => {
      const answer = await quickAnswer(query, settings);
      if (!answer) return [];
      return [
        {
          id: 'answer',
          title: answer.title,
          hint: answer.detail.replace(' · Enter برای رونوشت', ''),
          icon: answer.kind === 'calc' ? 'calculator' : 'swap',
          run: async () => {
            try {
              await navigator.clipboard.writeText(answer.copyText);
              toast('نتیجه رونوشت شد');
            } catch {
              toast('رونوشت ممکن نشد');
            }
          },
        },
      ];
    },
  };

  const actions = {
    group: 'فرمان‌ها',
    filter: true,
    items: () => {
      const live = instances();
      const list = [
        { id: 'theme', title: 'تغییر تم روشن/تیره', icon: 'sun', keywords: 'dark light تاریک روشن', hint: 'T', run: toggleTheme },
        { id: 'privacy', title: 'حالت پنهان (محو کردن اعداد و یادداشت‌ها)', icon: 'eyeOff', keywords: 'privacy blur پنهان مخفی', hint: 'H', run: togglePrivacy },
        { id: 'settings', title: 'باز کردن تنظیمات', icon: 'settings', keywords: 'settings', run: () => openSettings() },
        { id: 'help', title: 'میان‌برهای صفحه‌کلید', icon: 'keyboard', keywords: 'shortcut کلید راهنما', hint: '?', run: showHelp },
        ...SETTINGS_GROUPS.map(([group, label, keywords]) => ({
          id: `settings-${group}`,
          title: `تنظیمات: ${label}`,
          icon: 'settings',
          keywords,
          run: () => openSettings(group),
        })),
        ...WIDGET_REGISTRY.filter((widget) => widget.slot === 'panel' && settings.layout.visible[widget.id] !== false).map((widget, index) => ({
          id: `tab-${widget.id}`,
          title: `رفتن به ${widget.label}`,
          icon: widget.icon,
          hint: String(index + 1),
          keywords: 'زبانه پنل',
          run: () => selectTab(widget.id),
        })),
      ];
      if (live.get('timer')?.toggle) {
        list.push({ id: 'timer', title: 'شروع/توقف تایمر تمرکز', icon: 'timer', keywords: 'pomodoro پومودورو', run: () => live.get('timer').toggle() });
      }
      if (live.get('notes')?.open) {
        list.push({
          id: 'note-new',
          title: 'یادداشت تازه',
          icon: 'note',
          keywords: 'note یادداشت جدید',
          run: () => {
            selectTab('notes');
            live.get('notes').element.querySelector('.notes__add')?.click();
          },
        });
      }
      if (live.get('search')) {
        list.push({ id: 'focus-search', title: 'رفتن به نوار جست‌وجو', icon: 'search', hint: '/', keywords: 'search', run: () => live.get('search').focus() });
      }
      return list;
    },
  };

  const todo = {
    group: 'کارها',
    minQuery: 2,
    items: (query) => {
      const widget = instances().get('todo');
      if (!widget?.add) return [];
      return [
        {
          id: 'todo-add',
          title: `افزودن کار: «${query}»`,
          icon: 'plus',
          run: async () => {
            await widget.add(query);
            toast('به فهرست کارها اضافه شد');
          },
        },
      ];
    },
  };

  const notes = {
    group: 'یادداشت‌ها',
    minQuery: 1,
    items: (query) => {
      const widget = instances().get('notes');
      if (!widget?.list) return [];
      return widget
        .list()
        .map((note) => ({ ...note, score: matchScore(query, note.text) }))
        .filter((note) => note.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((note) => ({
          id: `note-${note.id}`,
          title: note.title,
          // یادداشت یک‌سطری چیزی بیش از عنوانش ندارد؛ تکرارش فقط شلوغی است
          hint: note.text.trim().includes('\n') ? snippet(note.text, query) : '',
          icon: 'note',
          run: () => {
            selectTab('notes');
            widget.open(note.id);
          },
        }));
    },
  };

  const sites = {
    group: 'میان‌برها و نشان‌ها',
    minQuery: 1,
    items: async (query) => {
      const [stored, top, marks] = await Promise.all([
        readData(STORAGE_KEYS.shortcuts, {}),
        send(MESSAGE.topSites).catch(() => []),
        query.length >= 2 ? send(MESSAGE.bookmarksSearch, { query, limit: 5 }).catch(() => []) : [],
      ]);
      const seen = new Set();
      const candidates = [...(stored?.custom ?? []), ...top, ...marks]
        .filter((item) => item?.url && !seen.has(item.url) && seen.add(item.url))
        .map((item) => ({ ...item, score: matchScore(query, `${item.title ?? ''} ${item.url}`) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);
      return candidates.map((item) => ({
        id: `site-${item.url}`,
        title: item.title || item.url,
        hint: hostOf(item.url),
        url: item.url,
        run: () => window.location.assign(item.url),
      }));
    },
  };

  const web = {
    group: 'وب',
    minQuery: 1,
    items: (query) => {
      const direct = urlFor(query);
      if (direct) {
        return [{ id: 'open-url', title: `باز کردن ${hostOf(direct) || query}`, icon: 'external', run: () => window.location.assign(direct) }];
      }
      const bang = parseBang(query);
      const chosen = bang ? SEARCH_ENGINES.find((item) => item.id === bang.engineId) : engine();
      const term = bang ? bang.query : query;
      return [
        {
          id: 'web-search',
          title: `جست‌وجوی «${term}» در ${chosen.label}`,
          icon: 'search',
          run: () => window.location.assign(chosen.url.replace('%s', encodeURIComponent(term))),
        },
      ];
    },
  };

  // ترتیب گروه‌ها = ترتیب روی صفحه، و Enter اولین ردیف را اجرا می‌کند: برای متن آزاد
  // پیش‌فرض باید جست‌وجو باشد، نه ساختن کار؛ پس «افزودن کار» آخر می‌آید
  return [answers, actions, notes, sites, web, todo];
}

/** تکه‌ای از متن یادداشت اطراف نخستین تطبیق، برای راهنمای کنار عنوان. */
function snippet(text, query) {
  const flat = text.replace(/\s+/g, ' ').trim();
  const at = flat.indexOf(query.trim().split(' ')[0]);
  const start = Math.max(0, at - 12);
  const piece = flat.slice(start, start + 48);
  return `${start > 0 ? '…' : ''}${piece}${start + 48 < flat.length ? '…' : ''}`;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
