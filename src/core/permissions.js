/**
 * درخواست مجوزهای اختیاری.
 *
 * chrome.permissions.request فقط در لحظهٔ یک «کنش کاربر» (کلیک) کار می‌کند، و
 * سرویس‌ورکر هیچ‌وقت چنین لحظه‌ای ندارد؛ پس درخواست باید مستقیم از خود صفحه برود،
 * همان‌جا که کاربر کلیک کرده است.
 */

/** @returns {Promise<boolean>} آیا اجازه داده شد */
export async function requestPermissions({ origins = [], permissions = [] } = {}) {
  if (!chrome.permissions?.request) return false;
  try {
    return await chrome.permissions.request({ origins, permissions });
  } catch {
    return false;
  }
}

/** @returns {Promise<boolean>} */
export async function hasPermissions({ origins = [], permissions = [] } = {}) {
  if (!chrome.permissions?.contains) return false;
  try {
    return await chrome.permissions.contains({ origins, permissions });
  } catch {
    return false;
  }
}
