/**
 * پالت فرمان (Ctrl+K) — یک ورودی برای همه‌چیز: کارهای صفحه، میان‌برها،
 * نشان‌های مرورگر، حساب سریع و جست‌وجو.
 *
 * منبع‌ها از بیرون تزریق می‌شوند؛ این ماژول فقط فهرست را نشان می‌دهد، مرتب می‌کند
 * و با صفحه‌کلید پیمایش می‌شود. هر منبع برای عبارت فعلی آیتم برمی‌گرداند.
 */

import { el, icon, faviconUrl } from '../core/dom.js';
import { openDialog } from './dialog.js';
import { matchScore } from '../lib/text.js';

const DEBOUNCE_MS = 120;
const MAX_PER_GROUP = 6;

/**
 * @typedef {{id:string, title:string, hint?:string, icon?:string, url?:string,
 *            keywords?:string, run:()=>void|Promise<void>, group?:string, score?:number}} PaletteItem
 * @typedef {{group:string, items:(query:string)=>PaletteItem[]|Promise<PaletteItem[]>,
 *            filter?:boolean, minQuery?:number}} PaletteSource
 *   `filter` یعنی آیتم‌ها ایستا هستند و پالت خودش با عبارت مطابقتشان می‌دهد.
 */

/**
 * @param {{sources:PaletteSource[], placeholder?:string}} options
 */
export function openPalette({ sources, placeholder = 'فرمان، سایت، نشان یا عبارت جست‌وجو…' }) {
  const input = el('input', {
    class: 'palette__input',
    type: 'text',
    autocomplete: 'off',
    spellcheck: false,
    placeholder,
    autofocus: true,
    role: 'combobox',
    'aria-expanded': 'true',
    'aria-controls': 'palette-list',
    'aria-label': 'پالت فرمان',
  });
  const list = el('div', { class: 'palette__list', id: 'palette-list', role: 'listbox' });
  const footer = el('div', { class: 'palette__foot' }, [
    el('span', {}, [el('kbd', { text: '↑↓' }), ' جابه‌جایی']),
    el('span', {}, [el('kbd', { text: 'Enter' }), ' اجرا']),
    el('span', {}, [el('kbd', { text: 'Esc' }), ' بستن']),
  ]);

  const content = el('div', { class: 'palette' }, [
    el('div', { class: 'palette__bar' }, [icon('command', { size: 18 }), input]),
    list,
    footer,
  ]);

  /** @type {PaletteItem[]} */
  let flat = [];
  let active = 0;
  let requestId = 0;
  let debounce = null;

  const dialog = openDialog({
    title: 'پالت فرمان',
    content,
    headless: true,
    className: 'dialog--palette',
    onClose: () => clearTimeout(debounce),
  });

  function syncActive({ scroll = true } = {}) {
    [...list.querySelectorAll('.palette__item')].forEach((node, index) => {
      const isActive = index === active;
      node.setAttribute('aria-selected', String(isActive));
      if (isActive && scroll) node.scrollIntoView({ block: 'nearest' });
    });
    input.setAttribute('aria-activedescendant', flat[active] ? `palette-item-${active}` : '');
  }

  async function execute(item) {
    if (!item) return;
    dialog.close();
    await item.run();
  }

  function renderGroups(groups) {
    flat = [];
    const children = [];
    for (const { group, items } of groups) {
      if (!items.length) continue;
      children.push(el('div', { class: 'palette__group', role: 'presentation', text: group }));
      for (const item of items) {
        const index = flat.length;
        flat.push(item);
        const glyph = item.url
          ? el('img', { class: 'palette__favicon', src: faviconUrl(item.url, 32), alt: '', on: { error: (event) => event.target.replaceWith(icon('globe', { size: 16 })) } })
          : icon(item.icon ?? 'dot', { size: 16 });
        children.push(
          el('button', {
            class: 'palette__item',
            type: 'button',
            role: 'option',
            id: `palette-item-${index}`,
            tabIndex: -1,
            on: {
              click: () => execute(item),
              mousemove: () => {
                if (active === index) return;
                active = index;
                syncActive({ scroll: false });
              },
            },
          }, [
            el('span', { class: 'palette__glyph' }, [glyph]),
            el('span', { class: 'palette__title', text: item.title }),
            item.hint && el('span', { class: 'palette__hint', text: item.hint }),
          ]),
        );
      }
    }
    if (!flat.length) children.push(el('p', { class: 'palette__empty', text: 'چیزی پیدا نشد.' }));
    list.replaceChildren(...children);
    active = Math.min(active, Math.max(0, flat.length - 1));
    syncActive();
  }

  async function update() {
    const query = input.value.trim();
    const id = ++requestId;
    const groups = await Promise.all(
      sources.map(async (source) => {
        if (query.length < (source.minQuery ?? 0)) return { group: source.group, items: [] };
        try {
          let items = await source.items(query);
          if (source.filter) {
            items = items
              .map((item) => ({ ...item, score: matchScore(query, `${item.title} ${item.keywords ?? ''}`) }))
              .filter((item) => item.score > 0)
              .sort((a, b) => b.score - a.score);
          }
          return { group: source.group, items: items.slice(0, MAX_PER_GROUP) };
        } catch {
          return { group: source.group, items: [] }; // یک منبعِ خراب نباید بقیه را بی‌اثر کند
        }
      }),
    );
    if (id !== requestId) return; // پاسخ کهنه
    active = 0;
    renderGroups(groups);
  }

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      debounce = null;
      update();
    }, DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!flat.length) return;
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length;
      syncActive();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      // اگر هنوز نتیجهٔ تایپ آخر نیامده، اول همان را می‌گیریم تا Enter روی فهرست کهنه اجرا نشود
      if (debounce) {
        clearTimeout(debounce);
        debounce = null;
        update().then(() => execute(flat[active]));
        return;
      }
      execute(flat[active]);
    }
  });

  update();
  return dialog;
}
