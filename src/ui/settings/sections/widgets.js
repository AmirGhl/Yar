/** بخش تنظیمات — ویجت‌ها: روشن و خاموش کردن هر بخش. */

import { el } from '../../../core/dom.js';
import { group, toggle } from '../controls.js';
import { WIDGET_REGISTRY } from '../../../core/defaults.js';

/**
 * @param {import('../drawer.js').SectionContext} context
 * @returns {HTMLElement}
 */
export function widgetSection({ settings, patch }) {
  const build = () =>
    group('ویجت‌ها', [
      el('p', { class: 'field__hint', text: 'هر بخشی را که نمی‌خواهید ببینید خاموش کنید.' }),
      ...WIDGET_REGISTRY.map((widget) =>
        toggle(widget.label, settings.layout.visible[widget.id] !== false, (value) =>
          patch({ layout: { visible: { [widget.id]: value } } }, { rebuildAfter: true }),
        ),
      ),
    ]);

  return build();
}
