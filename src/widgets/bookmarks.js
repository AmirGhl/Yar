/** مرور نشان‌های مرورگر با پیمایش پوشه‌ای. */

import { el, icon, faviconUrl } from '../core/dom.js';
import { createCard } from '../ui/card.js';
import { skeleton, errorState, emptyState } from '../ui/states.js';
import { MESSAGE, send } from '../core/messaging.js';

export function createBookmarks() {
  const { element, body } = createCard({ title: 'نشان‌ها', iconName: 'bookmark' });
  const crumbs = el('nav', { class: 'bookmarks__crumbs', 'aria-label': 'مسیر پوشه' });
  const list = el('div', { class: 'bookmarks__list' });
  body.append(crumbs, list);

  /** @type {Array<{id:string|null, title:string}>} */
  let path = [{ id: null, title: 'همهٔ نشان‌ها' }];

  const renderCrumbs = () => {
    crumbs.replaceChildren(
      ...path.flatMap((entry, index) => {
        const isLast = index === path.length - 1;
        const node = isLast
          ? el('span', { text: entry.title, style: { color: 'var(--text)' } })
          : el('button', {
              class: 'bookmarks__crumb',
              type: 'button',
              text: entry.title,
              on: {
                click: () => {
                  path = path.slice(0, index + 1);
                  load();
                },
              },
            });
        return index === 0 ? [node] : [el('span', { text: '/' }), node];
      }),
    );
  };

  async function load() {
    renderCrumbs();
    list.replaceChildren(skeleton({ rows: 5, height: '1.5rem' }));
    try {
      const nodes = await send(MESSAGE.bookmarks, { folderId: path.at(-1).id });
      if (!nodes.length) {
        list.replaceChildren(
          emptyState({
            iconName: 'bookmark',
            title: 'این پوشه خالی است',
            description: 'نشانی که در مرورگر ذخیره کنید اینجا دیده می‌شود.',
          }),
        );
        return;
      }

      list.replaceChildren(
        ...nodes.map((node) =>
          node.isFolder
            ? el(
                'button',
                {
                  class: 'bookmarks__row',
                  type: 'button',
                  on: {
                    click: () => {
                      path = [...path, { id: node.id, title: node.title || 'پوشه' }];
                      load();
                    },
                  },
                },
                [icon('grid', { size: 15 }), el('span', { text: node.title || 'پوشهٔ بی‌نام' })],
              )
            : el(
                'a',
                { class: 'bookmarks__row', href: node.url, title: node.url },
                [
                  el('img', {
                    src: faviconUrl(node.url, 32),
                    alt: '',
                    loading: 'lazy',
                    on: { error: (event) => event.target.remove() },
                  }),
                  el('span', { text: node.title || node.url }),
                ],
              ),
        ),
      );
    } catch (error) {
      list.replaceChildren(errorState({ message: error.message, onRetry: load }));
    }
  }

  load();
  return { element, refresh: load };
}
