/**
 * نوار جست‌وجو با انتخاب موتور، پیشنهاد زنده، پاسخ فوری و پیمایش با صفحه‌کلید.
 * جای‌گذاری و رفتار عمداً همان چیزی است که کاربر از نوار آدرس انتظار دارد.
 *
 * سه چیز اضافه بر نوار آدرس:
 *  - پاسخ فوری: «۲۵×۴» یا «۱۰۰ دلار» نتیجه را همان‌جا نشان می‌دهد (کلیک = رونوشت).
 *  - میان‌بر موتور: «!y گربه» همین یک بار در یوتیوب می‌گردد.
 *  - جست‌وجوهای اخیر: فقط روی همین دستگاه، با یک کلیک پاک می‌شوند.
 */

import { el, icon } from '../core/dom.js';
import { SEARCH_ENGINES } from '../core/defaults.js';
import { MESSAGE, send } from '../core/messaging.js';
import { updateSettings, readData, writeData, removeData, STORAGE_KEYS } from '../core/storage.js';
import { parseBang } from '../lib/bangs.js';
import { quickAnswer } from '../ui/answers.js';
import { toast } from '../ui/toast.js';

const DEBOUNCE_MS = 180;
const HISTORY_LIMIT = 6;

const engineById = (id) => SEARCH_ENGINES.find((item) => item.id === id);

/** چیزی که شبیه نشانی است مستقیم باز می‌شود، نه جست‌وجو. */
export function urlFor(term) {
  const looksLikeUrl = /^(https?:\/\/|[\w-]+(\.[\w-]+)*\.[a-z]{2,}(:\d+)?(\/|$)|localhost(:\d+)?(\/|$))/i.test(term) && !/\s/.test(term);
  if (!looksLikeUrl) return null;
  return /^https?:\/\//i.test(term) ? term : `https://${term}`;
}

export function createSearch({ settings }) {
  let engine = engineById(settings.search.engine) ?? SEARCH_ENGINES[0];
  /** @type {Array<{text:string, kind:'suggest'|'history'}>} */
  let options = [];
  let answer = null;
  let activeIndex = -1;
  let debounce = null;
  let requestId = 0;
  let history = [];

  const input = el('input', {
    class: 'search__input',
    type: 'search',
    autocomplete: 'off',
    spellcheck: false,
    placeholder: 'جست‌وجو، نشانی سایت، یا «۱۰۰ دلار»…',
    'aria-label': 'عبارت جست‌وجو',
    'aria-autocomplete': 'list',
    'aria-expanded': 'false',
    'aria-controls': 'search-suggestions',
  });

  const engineLabel = el('span', { text: engine.label });
  const engineButton = el(
    'button',
    { class: 'search__engine', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: 'تغییر موتور جست‌وجو' },
    [icon('grid', { size: 14 }), engineLabel],
  );

  const submit = el('button', { class: 'search__submit', type: 'submit', 'aria-label': 'جست‌وجو' }, [
    icon('search', { size: 19 }),
  ]);

  const panel = el('div', { class: 'search__panel', id: 'search-suggestions', role: 'listbox', hidden: true });
  const bar = el('div', { class: 'search__bar' }, [icon('search', { size: 18 }), input, engineButton, submit]);
  const form = el('form', { class: 'search', role: 'search' }, [bar, panel]);

  const closePanel = () => {
    panel.hidden = true;
    panel.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    engineButton.setAttribute('aria-expanded', 'false');
    activeIndex = -1;
  };

  async function remember(term) {
    if (!settings.search.history) return;
    history = [term, ...history.filter((item) => item !== term)].slice(0, HISTORY_LIMIT);
    await writeData(STORAGE_KEYS.searchHistory, history);
  }

  const go = async (query) => {
    const term = query.trim();
    if (!term) return;

    const direct = urlFor(term);
    let target = direct;
    if (!target) {
      const bang = parseBang(term);
      const chosen = bang ? engineById(bang.engineId) : engine;
      target = chosen.url.replace('%s', encodeURIComponent(bang ? bang.query : term));
      await remember(term);
    }

    if (settings.search.openInNewTab) window.open(target, '_blank', 'noopener');
    else window.location.assign(target);
  };

  const showBangEngine = () => {
    const bang = parseBang(input.value);
    engineLabel.textContent = bang ? engineById(bang.engineId).label : engine.label;
    engineButton.classList.toggle('is-bang', Boolean(bang));
  };

  const optionButton = (option, index) =>
    el(
      'button',
      {
        class: 'search__option',
        type: 'button',
        role: 'option',
        id: `suggestion-${index}`,
        'aria-selected': String(index === activeIndex),
        'data-kind': option.kind,
        on: {
          click: () => go(option.text),
          mousemove: () => {
            activeIndex = index;
            syncActive();
          },
        },
      },
      [icon(option.kind === 'history' ? 'history' : 'search', { size: 15 }), el('span', { text: option.text })],
    );

  const answerRow = () =>
    el(
      'button',
      {
        class: 'search__answer',
        type: 'button',
        title: 'رونوشت نتیجه',
        on: {
          click: async () => {
            try {
              await navigator.clipboard.writeText(answer.copyText);
              toast('نتیجه رونوشت شد');
            } catch {
              toast('رونوشت ممکن نشد');
            }
          },
        },
      },
      [
        el('span', { class: 'search__answer-icon' }, [icon(answer.kind === 'calc' ? 'calculator' : 'swap', { size: 16 })]),
        el('span', { class: 'search__answer-body' }, [
          el('b', { class: 'tnum', text: answer.title }),
          el('small', { text: answer.detail }),
        ]),
        icon('copy', { size: 14, className: 'search__answer-copy' }),
      ],
    );

  const renderPanel = () => {
    if (!options.length && !answer) {
      closePanel();
      return;
    }
    panel.dataset.mode = 'suggestions';
    const children = [];
    if (answer) children.push(answerRow());
    children.push(...options.map(optionButton));
    if (options.length && options.every((option) => option.kind === 'history')) {
      children.push(
        el('button', {
          class: 'search__clear',
          type: 'button',
          text: 'پاک کردن جست‌وجوهای اخیر',
          on: {
            click: async (event) => {
              event.stopPropagation();
              history = [];
              await removeData(STORAGE_KEYS.searchHistory);
              options = [];
              renderPanel();
              input.focus();
            },
          },
        }),
      );
    }
    panel.replaceChildren(...children);
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const syncActive = () => {
    panel.querySelectorAll('.search__option').forEach((node, index) => {
      node.setAttribute('aria-selected', String(index === activeIndex));
    });
    input.setAttribute('aria-activedescendant', activeIndex >= 0 ? `suggestion-${activeIndex}` : '');
  };

  const showHistory = () => {
    if (input.value.trim() || !history.length || !settings.search.history) return;
    options = history.map((text) => ({ text, kind: 'history' }));
    answer = null;
    activeIndex = -1;
    renderPanel();
  };

  const update = (query) => {
    const id = ++requestId;
    const trimmed = query.trim();
    if (!trimmed) {
      options = [];
      answer = null;
      closePanel();
      showHistory();
      return;
    }

    const matchingHistory = settings.search.history
      ? history.filter((item) => item !== trimmed && item.startsWith(trimmed)).slice(0, 2)
      : [];
    const wantSuggestions = settings.search.suggestions && trimmed.length >= 2 && !urlFor(trimmed);
    const bang = parseBang(trimmed);

    Promise.all([
      quickAnswer(trimmed, settings).catch(() => null),
      wantSuggestions ? send(MESSAGE.suggest, { query: bang ? bang.query : trimmed }).catch(() => []) : [],
    ]).then(([nextAnswer, suggestions]) => {
      if (id !== requestId) return; // پاسخ کهنه را دور می‌ریزیم
      answer = nextAnswer;
      const fresh = suggestions.filter((text) => !matchingHistory.includes(text));
      options = [
        ...matchingHistory.map((text) => ({ text, kind: 'history' })),
        ...fresh.map((text) => ({ text, kind: 'suggest' })),
      ].slice(0, 8);
      activeIndex = -1;
      renderPanel();
    });
  };

  const openEnginePicker = () => {
    const isOpen = !panel.hidden && panel.dataset.mode === 'engines';
    if (isOpen) {
      closePanel();
      return;
    }
    panel.dataset.mode = 'engines';
    panel.replaceChildren(
      el(
        'div',
        { class: 'search__engines' },
        SEARCH_ENGINES.map((item) =>
          el('button', {
            class: 'chip',
            type: 'button',
            text: item.label,
            'aria-pressed': String(item.id === engine.id),
            on: {
              click: async () => {
                engine = item;
                engineLabel.textContent = item.label;
                settings.search.engine = item.id;
                await updateSettings({ search: { engine: item.id } });
                closePanel();
                input.focus();
              },
            },
          }),
        ),
      ),
      el('p', { class: 'search__tip', text: 'نکته: «!y عبارت» یوتیوب، «!w» ویکی‌پدیا، «!t» ترب، «!dk» دیجی‌کالا.' }),
    );
    panel.hidden = false;
    engineButton.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('input', () => {
    showBangEngine();
    clearTimeout(debounce);
    const value = input.value;
    debounce = setTimeout(() => update(value), DEBOUNCE_MS);
  });

  input.addEventListener('focus', showHistory);

  input.addEventListener('keydown', (event) => {
    if (panel.hidden || panel.dataset.mode !== 'suggestions' || !options.length) {
      if (event.key === 'Escape') {
        if (!panel.hidden) closePanel();
        else input.blur();
      }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      activeIndex = (activeIndex + delta + options.length + 1) % (options.length + 1);
      if (activeIndex === options.length) activeIndex = -1;
      syncActive();
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      go(options[activeIndex].text);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closePanel();
    }
  });

  engineButton.addEventListener('click', openEnginePicker);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    go(input.value);
  });

  const onDocumentClick = (event) => {
    if (!form.contains(event.target)) closePanel();
  };
  document.addEventListener('click', onDocumentClick);

  (async () => {
    const stored = await readData(STORAGE_KEYS.searchHistory, []);
    history = Array.isArray(stored) ? stored : [];
  })();

  return {
    element: form,
    focus: () => input.focus(),
    /** پر کردن نوار از بیرون (پالت فرمان) و رفتن به نتیجه. */
    search: (query) => go(query),
    destroy() {
      clearTimeout(debounce);
      document.removeEventListener('click', onDocumentClick);
    },
  };
}
