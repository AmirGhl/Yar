/**
 * سنجش «یک صفحه بودن» در چند اندازهٔ رایج نمایشگر.
 * در کنسول پیش‌نمایش اجرا می‌شود: کپی کنید یا از طریق ابزار خودکار صدا بزنید.
 */
window.__yarFitCheck = async function fitCheck(sizes) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;inset-block-start:0;inset-inline-start:0;visibility:hidden;border:0;';
  document.body.append(frame);

  const results = [];
  for (const [w, h] of sizes) {
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    frame.src = 'index.html';
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => {
      frame.onload = () => setTimeout(resolve, 450);
    });
    const doc = frame.contentDocument;
    // انیمیشن ورود در فریمِ نامرئی یخ می‌زند و اندازه‌گیری را ۱۴ پیکسل جابه‌جا می‌کند
    doc.querySelectorAll('.reveal').forEach((node) => node.classList.remove('reveal'));
    const de = doc.documentElement;
    const over = (selector) => {
      const node = doc.querySelector(selector);
      return node ? node.scrollHeight - node.clientHeight : null;
    };
    results.push({
      size: `${w}×${h}`,
      pageX: de.scrollWidth - de.clientWidth,
      pageY: de.scrollHeight - de.clientHeight,
      side: over('#slot-side'),
      panel: over('#slot-panel'),
      hero: over('#slot-hero'),
      tabs: doc.querySelectorAll('.tabs__tab').length,
      shortcutCols: getComputedStyle(doc.querySelector('.shortcuts')).gridTemplateColumns.split(' ').length,
    });
  }
  frame.remove();
  return results;
};
