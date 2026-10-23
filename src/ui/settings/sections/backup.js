/** بخش تنظیمات — پشتیبان‌گیری و بازیابی. */

import { el, icon } from '../../../core/dom.js';
import { group } from '../controls.js';
import { getSettings } from '../../../core/storage.js';
import { exportBackup, importBackup } from '../../../core/backup.js';
import { toast } from '../../toast.js';
import { confirmDialog } from '../../confirm.js';

/**
 * @param {import('../drawer.js').SectionContext} context
 * @returns {HTMLElement}
 */
export function backupSection({ settings, render, apply, rebuild }) {
  const build = () => {
    const fileInput = el('input', {
      type: 'file',
      accept: 'application/json,.json',
      hidden: true,
      on: {
        change: async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const confirmed = await confirmDialog({
            title: 'بازیابی پشتیبان؟',
            description: 'تنظیمات، کارها، یادداشت، میان‌برها و رویدادهای تقویم با محتوای فایل جایگزین می‌شوند.',
            confirmLabel: 'بله، بازیابی کن',
            danger: true,
          });
          if (!confirmed) return;
          try {
            const restored = await importBackup(await file.text());
            const next = await getSettings({ fresh: true });
            Object.assign(settings, next);
            apply(next);
            rebuild();
            render();
            toast(`پشتیبان بازیابی شد (${restored} بخش)`);
          } catch (error) {
            toast(error.message);
          }
        },
      },
    });

    return group('پشتیبان‌گیری', [
      el('p', { class: 'field__hint', text: 'همه‌چیز در یک فایل: تنظیمات، کارها، یادداشت، میان‌برها و رویدادهای تقویم. برای انتقال به رایانهٔ دیگر.' }),
      el('div', { class: 'settings-row' }, [
        el('button', {
          class: 'btn',
          type: 'button',
          on: {
            click: async () => {
              await exportBackup();
              toast('فایل پشتیبان ساخته شد');
            },
          },
        }, [icon('download', { size: 16 }), 'دریافت پشتیبان']),
        el('button', { class: 'btn btn--ghost', type: 'button', on: { click: () => fileInput.click() } }, [
          icon('upload', { size: 16 }),
          'بازیابی از فایل',
        ]),
        fileInput,
      ]),
    ]);
  };

  return build();
}
