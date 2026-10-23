/** بخش تنظیمات — تایمر تمرکز: مدت‌ها، صدا، اعلان. */

import { el } from '../../../core/dom.js';
import { group, toggle } from '../controls.js';
import { toast } from '../../toast.js';
import { requestPermissions } from '../../../core/permissions.js';

/**
 * @param {import('../drawer.js').SectionContext} context
 * @returns {HTMLElement}
 */
export function timerSection({ settings, patch, render }) {
  const build = () => {
    const minutesField = (label, key, min, max) =>
      el('div', { class: 'field' }, [
        el('label', { class: 'field__label', for: `timer-${key}`, text: label }),
        el('input', {
          class: 'input',
          id: `timer-${key}`,
          type: 'number',
          min: String(min),
          max: String(max),
          value: String(settings.timer[key]),
          on: {
            change: (event) => {
              const value = Math.round(Number(event.target.value));
              if (!Number.isFinite(value) || value < min || value > max) {
                toast(`عددی بین ${min} و ${max} وارد کنید.`);
                event.target.value = String(settings.timer[key]);
                return;
              }
              patch({ timer: { [key]: value } }, { rebuildAfter: true });
            },
          },
        }),
      ]);

    return group('تایمر تمرکز', [
      el('div', { class: 'settings-row' }, [minutesField('تمرکز (دقیقه)', 'focusMinutes', 1, 180), minutesField('استراحت (دقیقه)', 'breakMinutes', 1, 60)]),
      toggle('صدای پایان جلسه', settings.timer.sound, (value) => patch({ timer: { sound: value } })),
      toggle(
        'اعلان دسکتاپ',
        settings.timer.notify,
        async (value) => {
          // مجوز دقیقاً همین لحظه و با کلیک کاربر خواسته می‌شود
          if (value && !(await requestPermissions({ permissions: ['notifications'] }))) {
            toast('بدون اجازهٔ اعلان، فقط صدا و پیام داخل صفحه می‌ماند.');
            render();
            return;
          }
          await patch({ timer: { notify: value } });
        },
        'وقتی جلسه تمام شود، حتی اگر تب بسته باشد خبر می‌دهد.',
      ),
    ]);
  };

  return build();
}
