/** مقادیر پیش‌فرض تنظیمات. تنها منبع حقیقت برای شکل تنظیمات همین فایل است. */

/** مخزن رسمی یار در گیت‌هاب — منبع پیش‌فرض بررسی نسخهٔ تازه. */
export const OFFICIAL_REPO = 'AmirGhl/Yar';

export const DEFAULT_CITY = {
  name: 'تهران',
  latitude: 35.6892,
  longitude: 51.389,
  timeZone: 'Asia/Tehran',
  country: 'ایران',
};

export const SEARCH_ENGINES = [
  { id: 'google', label: 'گوگل', url: 'https://www.google.com/search?q=%s' },
  { id: 'bing', label: 'بینگ', url: 'https://www.bing.com/search?q=%s' },
  { id: 'duckduckgo', label: 'داک‌داک‌گو', url: 'https://duckduckgo.com/?q=%s' },
  { id: 'youtube', label: 'یوتیوب', url: 'https://www.youtube.com/results?search_query=%s' },
  { id: 'wikipedia', label: 'ویکی‌پدیا', url: 'https://fa.wikipedia.org/w/index.php?search=%s' },
  { id: 'torob', label: 'ترب', url: 'https://torob.com/search/?query=%s' },
  { id: 'digikala', label: 'دیجی‌کالا', url: 'https://www.digikala.com/search/?q=%s' },
];

export const WALLPAPERS = [
  { id: 'midnight', label: 'نیمه‌شب', css: 'radial-gradient(1200px 800px at 80% -10%, #1e3a8a 0%, transparent 60%), radial-gradient(900px 700px at 10% 110%, #0f766e 0%, transparent 55%), linear-gradient(160deg, #05070f 0%, #0b1020 100%)' },
  { id: 'aurora', label: 'شفق', css: 'radial-gradient(900px 700px at 15% 15%, #7c3aed 0%, transparent 55%), radial-gradient(1000px 800px at 85% 80%, #06b6d4 0%, transparent 55%), linear-gradient(150deg, #060814 0%, #0d1226 100%)' },
  { id: 'ember', label: 'غروب', css: 'radial-gradient(1000px 700px at 80% 10%, #b45309 0%, transparent 55%), radial-gradient(900px 800px at 5% 90%, #9f1239 0%, transparent 55%), linear-gradient(160deg, #0b0710 0%, #1a0f18 100%)' },
  { id: 'moss', label: 'جنگل', css: 'radial-gradient(900px 700px at 20% 0%, #15803d 0%, transparent 55%), radial-gradient(1000px 800px at 90% 100%, #0e7490 0%, transparent 55%), linear-gradient(155deg, #050b09 0%, #0a1512 100%)' },
  { id: 'sand', label: 'کویر', css: 'radial-gradient(900px 700px at 85% 5%, #d97706 0%, transparent 50%), radial-gradient(900px 900px at 0% 100%, #78350f 0%, transparent 55%), linear-gradient(160deg, #0d0a06 0%, #17110a 100%)' },
  { id: 'plain', label: 'ساده', css: 'linear-gradient(180deg, #070910 0%, #0b0f1a 100%)' },
];

/**
 * ماژول‌های قابل نمایش و جای هرکدام روی صفحه.
 *
 * صفحه دقیقاً یک نمای کامل است و اسکرول نمی‌خورد، پس هر ویجت باید بداند
 * در کدام ناحیه می‌نشیند: `hero` وسط، `right`/`left` ستون‌های کناری،
 * و `dock` داخل قاب زبانه‌دار پایین که چند ویجت را در یک فضا جا می‌دهد.
 *
 * `tabLabel` نام کوتاه‌تر روی زبانهٔ پنل است، جایی که پهنا کم است.
 * `grow` یعنی این کارت فضای خالی ستون را پر کند و در صورت نیاز خودش اسکرول بخورد.
 */
export const WIDGET_REGISTRY = [
  { id: 'today', label: 'امروز (ساعت، تاریخ، آب‌وهوا)', slot: 'side' },
  { id: 'calendar', label: 'تقویم', slot: 'side' },
  { id: 'search', label: 'جست‌وجو', slot: 'hero' },
  { id: 'shortcuts', label: 'میان‌برها', slot: 'hero' },
  { id: 'todo', label: 'کارها', slot: 'panel', icon: 'list' },
  { id: 'notes', label: 'یادداشت', slot: 'panel', icon: 'note' },
  { id: 'news', label: 'اخبار', slot: 'panel', icon: 'news' },
  { id: 'bookmarks', label: 'نشان‌ها', slot: 'panel', icon: 'bookmark' },
  { id: 'timer', label: 'تایمر تمرکز', tabLabel: 'تایمر', slot: 'panel', icon: 'timer' },
  { id: 'converter', label: 'مبدل ارز و تاریخ', tabLabel: 'مبدل', slot: 'panel', icon: 'swap' },
  { id: 'portfolio', label: 'سبد دارایی', tabLabel: 'سبد', slot: 'panel', icon: 'wallet' },
  { id: 'market', label: 'نوار نرخ‌ها', slot: 'ticker' },
];

export const DEFAULT_FEEDS = [
  { id: 'zoomit', label: 'زومیت', url: 'https://www.zoomit.ir/feed/', enabled: true },
  { id: 'digiato', label: 'دیجیاتو', url: 'https://digiato.com/feed', enabled: true },
  { id: 'irna', label: 'ایرنا', url: 'https://www.irna.ir/rss', enabled: false },
  { id: 'isna', label: 'ایسنا', url: 'https://www.isna.ir/rss', enabled: false },
  { id: 'varzesh3', label: 'ورزش سه', url: 'https://www.varzesh3.com/rss/all', enabled: false },
];

/** نمادهای بازار که کاربر می‌تواند انتخاب کند (کلید = کلید API تی‌جی‌جو). */
export const MARKET_SYMBOLS = [
  { id: 'price_dollar_rl', label: 'دلار', unit: 'toman', group: 'currency' },
  { id: 'price_eur', label: 'یورو', unit: 'toman', group: 'currency' },
  { id: 'price_gbp', label: 'پوند', unit: 'toman', group: 'currency' },
  { id: 'price_aed', label: 'درهم امارات', unit: 'toman', group: 'currency' },
  { id: 'price_try', label: 'لیر ترکیه', unit: 'toman', group: 'currency' },
  { id: 'price_cad', label: 'دلار کانادا', unit: 'toman', group: 'currency' },
  { id: 'sekee', label: 'سکهٔ امامی', unit: 'toman', group: 'gold' },
  { id: 'sekeb', label: 'سکهٔ بهار آزادی', unit: 'toman', group: 'gold' },
  { id: 'nim', label: 'نیم‌سکه', unit: 'toman', group: 'gold' },
  { id: 'rob', label: 'ربع‌سکه', unit: 'toman', group: 'gold' },
  { id: 'gerami', label: 'سکهٔ گرمی', unit: 'toman', group: 'gold' },
  { id: 'geram18', label: 'طلای ۱۸ عیار', unit: 'toman', group: 'gold' },
  { id: 'geram24', label: 'طلای ۲۴ عیار', unit: 'toman', group: 'gold' },
  { id: 'mesghal', label: 'مثقال طلا', unit: 'toman', group: 'gold' },
  // نقرهٔ داخلی در tgju قیمت «هر گرم» به ریال است
  { id: 'silver_999', label: 'نقرهٔ ۹۹۹ (گرم)', unit: 'toman', group: 'silver' },
  { id: 'silver_925', label: 'نقرهٔ ۹۲۵ (گرم)', unit: 'toman', group: 'silver' },
  { id: 'silver', label: 'انس جهانی نقره', unit: 'usd', group: 'silver' },
  { id: 'ons', label: 'انس جهانی طلا', unit: 'usd', group: 'global' },
  { id: 'crypto-bitcoin', label: 'بیت‌کوین', unit: 'usd', group: 'crypto' },
  { id: 'crypto-ethereum', label: 'اتریوم', unit: 'usd', group: 'crypto' },
  { id: 'crypto-tether-irr', label: 'تتر', unit: 'toman', group: 'crypto' },
  { id: 'bourse', label: 'شاخص کل بورس', unit: 'index', group: 'global' },
];

export const DEFAULTS = {
  /** نسخهٔ شکل تنظیمات؛ مهاجرت‌ها در storage.js بر اساس همین اجرا می‌شوند. */
  version: 3,
  appearance: {
    theme: 'dark', // dark | light | auto
    wallpaper: 'midnight',
    customWallpaper: null, // data URL
    wallpaperDim: 0.28,
    glass: true,
    reduceMotion: false,
    persianDigits: true,
    /** حالت پنهان: اعداد مالی و یادداشت‌ها محو می‌شوند (برای اشتراک صفحه یا جای شلوغ). */
    privacy: false,
    accent: '#38bdf8',
    density: 'comfortable', // comfortable | compact
  },
  general: {
    userName: '',
    greeting: true,
    seconds: false,
  },
  search: {
    engine: 'google',
    suggestions: true,
    openInNewTab: false,
    /** جست‌وجوهای اخیر فقط روی همین دستگاه نگه داشته می‌شوند. */
    history: true,
  },
  weather: {
    city: DEFAULT_CITY,
    useGeolocation: false,
    /** کیفیت هوا (AQI) — اختیاری، با مجوز جداگانهٔ دامنهٔ air-quality-api.open-meteo.com */
    airQuality: false,
    unit: 'celsius',
  },
  market: {
    symbols: ['price_dollar_rl', 'sekee', 'geram18', 'silver_999', 'crypto-bitcoin', 'crypto-tether-irr', 'price_eur'],
    currencyUnit: 'toman', // toman | rial
  },
  news: {
    feeds: DEFAULT_FEEDS,
    limit: 8,
  },
  layout: {
    visible: WIDGET_REGISTRY.reduce((acc, widget) => {
      acc[widget.id] = true;
      return acc;
    }, {}),
    order: WIDGET_REGISTRY.map((widget) => widget.id),
    /** زبانهٔ فعال پنل کناری، تا بعد از بستن تب همان‌جا باز شود. */
    panelTab: 'todo',
  },
  update: {
    /** مخزن گیت‌هاب برای بررسی نسخهٔ تازه: «owner/repo» یا نشانی کامل */
    repo: OFFICIAL_REPO,
    /** هر ۶ ساعت خودکار بررسی شود */
    auto: true,
    /** نسخهٔ تازه با اعلان دسکتاپ و پیام داخل صفحه خبر داده شود */
    notify: true,
  },
  timer: {
    focusMinutes: 25,
    breakMinutes: 5,
    /** صدای کوتاه پایان جلسه (با Web Audio ساخته می‌شود، فایل صوتی ندارد). */
    sound: true,
    /** اعلان دسکتاپ، حتی وقتی تب بسته است — نیاز به مجوز اختیاری notifications. */
    notify: false,
  },
};

/** نسخهٔ عمیق و قابل تغییرِ پیش‌فرض‌ها. */
export function cloneDefaults() {
  return structuredClone(DEFAULTS);
}
