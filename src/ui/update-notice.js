/**
 * خبر دادن نسخهٔ تازه داخل صفحه: یک توست با «جزئیات»، و دکمهٔ برجستهٔ «نسخهٔ تازه»
 * در ریل بالا تا وقتی که کاربر نصبش کند یا نادیده‌اش بگیرد.
 *
 * هر نسخه در هر تب یک بار توست می‌گیرد؛ «یادم بینداز» و «نادیده بگیر» رعایت می‌شوند.
 * بعد از به‌روز شدن هم یک بار «یار به‌روز شد — تازه‌ها».
 */

import { readData, writeData, onDataChanged } from '../core/storage.js';
import { toast } from './toast.js';
import { openUpdateDialog, openWhatsNew } from './update-dialog.js';
import { isNewer, shouldAnnounce } from '../lib/versions.js';
import { toFaDigits } from '../lib/format.js';

const UPDATE_KEY = 'yar:update';
const UPDATED_KEY = 'yar:updated-from';

/**
 * @param {{settings:object, onAvailabilityChange:(available:boolean, open:()=>void)=>void}} options
 *   `onAvailabilityChange` برای نشان/پنهان کردن دکمهٔ ریل بالا
 * @returns {() => void} لغو اشتراک
 */
export function watchUpdates({ settings, onAvailabilityChange }) {
  const current = chrome.runtime.getManifest?.().version;
  const digits = (value) => (settings.appearance.persianDigits ? toFaDigits(value) : String(value));
  const announced = new Set();
  let state = null;

  const open = () => state && openUpdateDialog({ state, settings });

  function react(next) {
    state = next;
    const available = next?.status === 'available' && next.latest && (!current || isNewer(next.latest.version, current));
    onAvailabilityChange(Boolean(available) && next.dismissedVersion !== next.latest.version, open);
    if (settings.update?.notify === false || !shouldAnnounce(next, { current })) return;
    if (announced.has(next.latest.version)) return;
    announced.add(next.latest.version);
    toast(`نسخهٔ تازهٔ یار آماده است: ${digits(next.latest.version)}`, {
      actionLabel: 'جزئیات',
      onAction: open,
      duration: 12000,
    });
  }

  (async () => {
    react(await readData(UPDATE_KEY, null));

    // تازه به‌روز شده‌ایم؟ یک بار «تازه‌ها»
    const updated = await readData(UPDATED_KEY, null);
    if (updated && !updated.seen && updated.to === current) {
      await writeData(UPDATED_KEY, { ...updated, seen: true });
      toast(`یار به نسخهٔ ${digits(updated.to)} به‌روز شد`, {
        actionLabel: 'تازه‌ها',
        onAction: () => openWhatsNew({ updated, state, settings }),
        duration: 12000,
      });
    }
  })();

  return onDataChanged(UPDATE_KEY, react);
}
