/** بخش تنظیمات — به‌روزرسانی: نسخهٔ فعلی، مخزن گیت‌هاب، بررسی خودکار و دستی. */

import { el, icon } from '../../../core/dom.js';
import { group, toggle } from '../controls.js';
import { readData, onDataChanged } from '../../../core/storage.js';
import { MESSAGE, send } from '../../../core/messaging.js';
import { requestPermissions } from '../../../core/permissions.js';
import { parseRepo, isNewer } from '../../../lib/versions.js';
import { OFFICIAL_REPO } from '../../../core/defaults.js';
import { toFaDigits, timeAgo } from '../../../lib/format.js';
import { toast } from '../../toast.js';
import { openUpdateDialog, installedFromStore } from '../../update-dialog.js';

const UPDATE_KEY = 'yar:update';

/**
 * @param {import('../drawer.js').SectionContext} context
 * @returns {HTMLElement}
 */
export function updatesSection({ settings, patch }) {
  const persianDigits = settings.appearance.persianDigits;
  const digits = (value) => (persianDigits ? toFaDigits(value) : String(value));
  const current = chrome.runtime.getManifest?.().version ?? '—';

  const status = el('div', { class: 'update-status', 'aria-live': 'polite' });
  const checkButton = el('button', { class: 'btn', type: 'button' }, [icon('refresh', { size: 15 }), 'بررسی کن']);

  function renderStatus(state) {
    const children = [];
    const checked = state?.checkedAt ? ` · بررسی ${timeAgo(state.checkedAt, { persianDigits })}` : '';
    const newer = state?.latest && isNewer(state.latest.version, current);

    if (newer) {
      status.dataset.state = 'available';
      children.push(
        el('p', { class: 'update-status__line' }, [icon('sparkle', { size: 14 }), el('b', { text: `نسخهٔ ${digits(state.latest.version)} آماده است` }), el('span', { text: checked })]),
        el('button', {
          class: 'btn btn--primary',
          type: 'button',
          on: { click: () => openUpdateDialog({ state, settings }) },
        }, [icon('download', { size: 15 }), 'تازه‌ها و دریافت']),
      );
    } else if (state?.status === 'latest') {
      status.dataset.state = 'latest';
      children.push(el('p', { class: 'update-status__line' }, [icon('check', { size: 14 }), el('span', { text: `آخرین نسخه نصب است${checked}` })]));
    } else {
      status.dataset.state = 'idle';
      children.push(el('p', { class: 'update-status__line', text: state?.checkedAt ? `هنوز نتیجه‌ای نیست${checked}` : 'هنوز بررسی نشده است.' }));
    }
    if (state?.error) {
      children.push(el('p', { class: 'update-status__error', role: 'alert', text: state.error }));
    }
    status.replaceChildren(...children);
  }

  async function checkNow() {
    checkButton.disabled = true;
    checkButton.classList.add('is-busy');
    try {
      const state = await send(MESSAGE.updateCheck);
      renderStatus(state);
      if (state.error) toast(state.error);
      else if (state.status === 'latest') toast('یار به‌روز است');
    } catch (error) {
      toast(error.message);
    } finally {
      checkButton.disabled = false;
      checkButton.classList.remove('is-busy');
    }
  }
  checkButton.addEventListener('click', checkNow);

  // --- مخزن ---
  const repoInput = el('input', {
    class: 'input',
    type: 'text',
    dir: 'ltr',
    spellcheck: false,
    placeholder: OFFICIAL_REPO,
    value: settings.update.repo,
    'aria-label': 'مخزن گیت‌هاب',
  });
  repoInput.addEventListener('change', async () => {
    const value = repoInput.value.trim();
    // خالی کردن یعنی «برگرد به مخزن رسمی»؛ خاموش کردن بررسی کار کلید «بررسی خودکار» است
    const repo = value ? parseRepo(value) : OFFICIAL_REPO;
    if (value && !repo) {
      toast('نشانی مخزن معتبر نیست. مثال: owner/yar');
      return;
    }
    repoInput.value = repo;
    await patch({ update: { repo } });
    checkNow();
  });

  // وضعیت تازه از سرویس‌ورکر (بررسی خودکار در پس‌زمینه) همین‌جا هم دیده شود.
  // کشو با هر رندر بخش‌ها را از نو می‌سازد و با بستن کل کشو را برمی‌دارد؛ پس هر بار
  // که خبری رسید و این بخش دیگر روی صفحه نبود، اشتراک خودش را لغو می‌کند.
  const unsubscribe = onDataChanged(UPDATE_KEY, (state) => {
    if (!section.isConnected) {
      unsubscribe();
      return;
    }
    renderStatus(state);
  });
  readData(UPDATE_KEY, null).then(renderStatus);

  const section = group('به‌روزرسانی', [
    el('p', { class: 'field__hint' }, [
      `نسخهٔ نصب‌شده: `,
      el('b', { class: 'tnum', text: digits(current) }),
      installedFromStore() ? ' — از فروشگاه کروم (خودکار به‌روز می‌شود)' : ' — نصب باز (Load unpacked)',
    ]),
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label', text: 'مخزن گیت‌هاب' }),
      repoInput,
      el('span', { class: 'field__hint', text: `پیش‌فرض: مخزن رسمی ${OFFICIAL_REPO}. برای نسخهٔ خودتان (fork) نشانی آن را بنویسید.` }),
    ]),
    el('div', { class: 'settings-row' }, [checkButton]),
    status,
    toggle('بررسی خودکار', settings.update.auto, (value) => patch({ update: { auto: value } }), 'هر ۶ ساعت یک بار، بی‌صدا در پس‌زمینه.'),
    toggle(
      'خبرم کن',
      settings.update.notify,
      async (value) => {
        // اعلان دسکتاپ اختیاری است؛ بدون آن، پیام داخل صفحه و دکمهٔ «نسخهٔ تازه» کافی است
        if (value) await requestPermissions({ permissions: ['notifications'] });
        await patch({ update: { notify: value } });
      },
      'پیام داخل صفحه و (اگر اجازه بدهید) اعلان دسکتاپ، برای هر نسخه یک بار.',
    ),
  ]);

  return section;
}
