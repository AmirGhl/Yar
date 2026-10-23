/** بخش تنظیمات — عمومی: نام، سلام، ثانیه. */

import { el } from '../../../core/dom.js';
import { group, toggle } from '../controls.js';

/**
 * @param {import('../drawer.js').SectionContext} context
 * @returns {HTMLElement}
 */
export function generalSection({ settings, patch }) {
  const build = () =>
    group('عمومی', [
      el('div', { class: 'field' }, [
        el('label', { class: 'field__label', for: 'user-name', text: 'نام شما' }),
        el('input', {
          class: 'input',
          id: 'user-name',
          type: 'text',
          maxlength: '30',
          value: settings.general.userName,
          placeholder: 'مثلاً: امیر',
          on: { change: (event) => patch({ general: { userName: event.target.value.trim() } }, { rebuildAfter: true }) },
        }),
        el('span', { class: 'field__hint', text: 'در سلام بالای صفحه استفاده می‌شود.' }),
      ]),
      toggle('نمایش سلام', settings.general.greeting, (value) => patch({ general: { greeting: value } }, { rebuildAfter: true })),
      toggle('نمایش ثانیه', settings.general.seconds, (value) => patch({ general: { seconds: value } }, { rebuildAfter: true })),
    ]);

  return build();
}
