/** جابه‌جایی یک عنصر در آرایه — بدون تغییر آرایهٔ اصلی. */

/**
 * @template T
 * @param {T[]} list
 * @param {number} from
 * @param {number} to جای نهایی عنصر در آرایهٔ خروجی
 * @returns {T[]}
 */
export function moveItem(list, from, to) {
  const out = [...list];
  if (from < 0 || from >= out.length) return out;
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(to, out.length)), 0, item);
  return out;
}
