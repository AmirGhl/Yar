/** بخش تنظیمات — اخبار: منابع و خبرخوان دلخواه. */

import { el } from '../../../core/dom.js';
import { group, toggle } from '../controls.js';
import { toast } from '../../toast.js';
import { requestPermissions } from '../../../core/permissions.js';

/**
 * @param {import('../drawer.js').SectionContext} context
 * @returns {HTMLElement}
 */
export function newsSection({ settings, patch, render }) {
  const build = () => {
    const feedList = el(
      'div',
      { class: 'field' },
      settings.news.feeds.map((feed) =>
        toggle(feed.label, feed.enabled, async (value) => {
          const feeds = settings.news.feeds.map((entry) =>
            entry.id === feed.id ? { ...entry, enabled: value } : entry,
          );
          await patch({ news: { feeds } }, { rebuildAfter: true });
        }),
      ),
    );

    const urlInput = el('input', {
      class: 'input',
      type: 'url',
      placeholder: 'https://example.com/feed',
      'aria-label': 'نشانی خبرخوان',
    });
    const nameInput = el('input', { class: 'input', type: 'text', placeholder: 'نام منبع', 'aria-label': 'نام منبع' });

    const addButton = el('button', { class: 'btn', type: 'button', text: 'افزودن منبع' });
    addButton.addEventListener('click', async () => {
      let origin;
      try {
        origin = `${new URL(urlInput.value).origin}/*`;
      } catch {
        toast('نشانی معتبر نیست. مثال: https://example.com/feed');
        return;
      }
      // دسترسی به دامنهٔ تازه دقیقاً همین‌جا و با آگاهی کاربر گرفته می‌شود
      const granted = await requestPermissions({ origins: [origin] });
      if (!granted) {
        toast('بدون اجازهٔ دسترسی به این دامنه، خبرها خوانده نمی‌شوند.');
        return;
      }
      const feeds = [
        ...settings.news.feeds,
        {
          id: `custom-${Date.now()}`,
          label: nameInput.value.trim() || new URL(urlInput.value).hostname,
          url: urlInput.value,
          enabled: true,
        },
      ];
      await patch({ news: { feeds } }, { rebuildAfter: true });
      urlInput.value = '';
      nameInput.value = '';
      render();
      toast('منبع خبری اضافه شد');
    });

    return group('اخبار', [
      feedList,
      el('div', { class: 'field' }, [
        el('span', { class: 'field__label', text: 'افزودن خبرخوان دلخواه' }),
        nameInput,
        urlInput,
        addButton,
      ]),
    ]);
  };

  return build();
}
