/** بخش تنظیمات — جست‌وجو: موتور، پیشنهاد، تب تازه، جست‌وجوهای اخیر. */

import { group, toggle, selectField } from '../controls.js';
import { removeData, STORAGE_KEYS } from '../../../core/storage.js';
import { SEARCH_ENGINES } from '../../../core/defaults.js';

/**
 * @param {import('../drawer.js').SectionContext} context
 * @returns {HTMLElement}
 */
export function searchSection({ settings, patch }) {
  const build = () =>
    group('جست‌وجو', [
      selectField(
        'موتور پیش‌فرض',
        SEARCH_ENGINES.map((engine) => ({ value: engine.id, label: engine.label })),
        settings.search.engine,
        (value) => patch({ search: { engine: value } }, { rebuildAfter: true }),
      ),
      toggle(
        'پیشنهاد زنده',
        settings.search.suggestions,
        (value) => patch({ search: { suggestions: value } }),
        'عبارت تایپ‌شده برای گرفتن پیشنهاد به گوگل فرستاده می‌شود.',
      ),
      toggle('باز کردن نتیجه در تب تازه', settings.search.openInNewTab, (value) =>
        patch({ search: { openInNewTab: value } }),
      ),
      toggle(
        'جست‌وجوهای اخیر',
        settings.search.history,
        async (value) => {
          await patch({ search: { history: value } });
          if (!value) await removeData(STORAGE_KEYS.searchHistory);
        },
        'فقط روی همین دستگاه نگه داشته می‌شود. خاموش کردن، فهرست را هم پاک می‌کند.',
      ),
    ]);

  return build();
}
