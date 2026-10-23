/**
 * حرکت فنری، قابل قطع و سرعت‌آگاه.
 *
 * پارامترها به سبک اپل تعریف شده‌اند: `damping` (میزان جهش؛ ۱ یعنی بدون تجاوز از هدف)
 * و `response` (سرعت رسیدن به هدف بر حسب ثانیه) — نه «مدت‌زمان» ثابت.
 * انیمیشن همیشه از مقدار فعلی روی صفحه شروع می‌شود، پس وسط راه هم می‌توان هدف را عوض کرد.
 */

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** آیا کاربر یا تنظیمات افزونه حرکت کمتر خواسته‌اند؟ */
export function prefersReducedMotion(settingOverride = false) {
  return settingOverride || window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * یک فنر عددی می‌سازد.
 *
 * @param {{value?:number, damping?:number, response?:number,
 *          onUpdate:(value:number)=>void, onRest?:()=>void}} options
 */
export function createSpring({ value = 0, damping = 1, response = 0.4, onUpdate, onRest }) {
  let current = value;
  let velocity = 0;
  let target = value;
  let frame = null;
  let last = 0;

  const step = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 30); // پرش‌های بلند (تب پنهان) را محدود می‌کنیم
    last = now;

    const omega = (2 * Math.PI) / response;
    const stiffness = omega * omega;
    const dampingCoefficient = 2 * damping * omega;

    // انتگرال‌گیری نیمه‌ضمنی: پایدار و ارزان، و در هر فریم قابل هدف‌گذاری مجدد.
    const acceleration = -stiffness * (current - target) - dampingCoefficient * velocity;
    velocity += acceleration * dt;
    current += velocity * dt;

    onUpdate(current);

    if (Math.abs(current - target) < 0.0005 && Math.abs(velocity) < 0.0005) {
      current = target;
      velocity = 0;
      onUpdate(current);
      frame = null;
      onRest?.();
      return;
    }
    frame = requestAnimationFrame(step);
  };

  return {
    /** هدف تازه؛ حرکت از مقدار و سرعت فعلی ادامه پیدا می‌کند. */
    set(next, { velocity: initialVelocity } = {}) {
      target = next;
      if (initialVelocity != null) velocity = initialVelocity;
      if (frame == null) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    },
    /** پرش فوری بدون انیمیشن (برای reduced-motion). */
    jump(next) {
      target = next;
      current = next;
      velocity = 0;
      if (frame != null) cancelAnimationFrame(frame);
      frame = null;
      onUpdate(current);
    },
    stop() {
      if (frame != null) cancelAnimationFrame(frame);
      frame = null;
      velocity = 0;
    },
    get value() {
      return current;
    },
    get velocity() {
      return velocity;
    },
  };
}

/**
 * نقطهٔ فرود یک پرتاب، از روی سرعت رها شدن (همان فرمول کاهش شتاب اسکرول).
 * برای تصمیم «بستن یا برگرداندن» یک شیت/کارت کشیده‌شده.
 */
export function projectMomentum(velocity, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** مقاومت تدریجی در لبه‌ها به‌جای توقف ناگهانی. */
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * ظاهر شدن پلکانی کارت‌ها هنگام بارگذاری.
 *
 * انیمیشن «افزودنی» است: حالت طبیعی کارت همان حالت دیده‌شده است و انیمیشن فقط
 * آن را به داخل می‌آورد. اگر تب در پس‌زمینه باز شود و انیمیشن اصلاً اجرا نشود،
 * محتوا باز هم دیده می‌شود — برخلاف الگویی که اول opacity را صفر می‌کند.
 */
export function revealStagger(nodes, { reduced = false, step = 45 } = {}) {
  if (reduced) return;

  const start = () => {
    nodes.forEach((node, index) => {
      node.style.setProperty('--reveal-delay', `${index * step}ms`);
      node.classList.add('reveal');
    });
  };

  // تب جدید ممکن است در پس‌زمینه ساخته شود؛ آنجا زمان‌بندی انیمیشن متوقف است و
  // شروع زودهنگام کارت‌ها را نامرئی نگه می‌دارد. پس تا لحظهٔ دیده شدن صبر می‌کنیم.
  if (document.visibilityState === 'visible') {
    start();
    return;
  }
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', onVisible);
    start();
  };
  document.addEventListener('visibilitychange', onVisible);
}
