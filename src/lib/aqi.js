/**
 * شاخص کیفیت هوا (US AQI) → دستهٔ فارسی و توصیهٔ کوتاه.
 * مرزها همان جدول رسمی EPA است که ایستگاه‌های تهران هم گزارش می‌دهند.
 */

const LEVELS = [
  { max: 50, id: 'good', label: 'پاک', advice: 'هوا برای همه مناسب است.' },
  { max: 100, id: 'moderate', label: 'قابل قبول', advice: 'افراد بسیار حساس فعالیت طولانی بیرون را کم کنند.' },
  { max: 150, id: 'sensitive', label: 'ناسالم برای گروه‌های حساس', advice: 'کودکان، سالمندان و بیماران قلبی و تنفسی بیرون کمتر بمانند.' },
  { max: 200, id: 'unhealthy', label: 'ناسالم', advice: 'فعالیت بیرون را کم کنید؛ ماسک مناسب کمک می‌کند.' },
  { max: 300, id: 'very-unhealthy', label: 'بسیار ناسالم', advice: 'تا جای ممکن بیرون نروید.' },
  { max: Infinity, id: 'hazardous', label: 'خطرناک', advice: 'در خانه بمانید و پنجره‌ها را ببندید.' },
];

/** @returns {{value:number, id:string, label:string, advice:string}|null} */
export function describeAqi(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  const rounded = Math.round(value);
  const level = LEVELS.find((item) => rounded <= item.max);
  return { value: rounded, id: level.id, label: level.label, advice: level.advice };
}
