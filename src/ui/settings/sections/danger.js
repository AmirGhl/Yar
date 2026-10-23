/** بخش تنظیمات — بازنشانی همهٔ تنظیمات. */

import { el } from '../../../core/dom.js';
import { group } from '../controls.js';
import { resetSettings } from '../../../core/storage.js';
import { toast } from '../../toast.js';
import { confirmDialog } from '../../confirm.js';

/**
 * @param {import('../drawer.js').SectionContext} context
 * @returns {HTMLElement}
 */
export function dangerSection({ settings, render, apply, rebuild }) {
  const build = () =>
    group('بازنشانی', [
      el('button', {
        class: 'btn btn--danger',
        type: 'button',
        text: 'بازگرداندن همهٔ تنظیمات به حالت اولیه',
        on: {
          click: async () => {
            const confirmed = await confirmDialog({
              title: 'بازنشانی تنظیمات؟',
              description:
                'همهٔ تنظیمات ظاهری، شهر، نمادهای بازار و منابع خبری به حالت اولیه برمی‌گردد. کارها، یادداشت‌ها و میان‌برها دست‌نخورده می‌مانند. این کار برگشت‌پذیر نیست.',
              confirmLabel: 'بله، بازنشانی کن',
              danger: true,
            });
            if (!confirmed) return;
            const next = await resetSettings();
            Object.assign(settings, next);
            apply(next);
            rebuild();
            render();
            toast('تنظیمات به حالت اولیه برگشت');
          },
        },
      }),
    ]);

  return build();
}
