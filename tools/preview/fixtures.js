/** دادهٔ نمونه برای پیش‌نمایش (ابزار توسعه). */
window.__YAR_FIXTURES__ = {
  update: {
    status: 'available',
    current: '1.6.0',
    repo: 'example/yar',
    checkedAt: Date.now() - 1000 * 60 * 40,
    error: null,
    notifiedVersion: null,
    dismissedVersion: null,
    latest: {
      version: '1.7.0',
      name: 'یار ۱٫۷',
      url: 'https://github.com/example/yar/releases/tag/v1.7.0',
      downloadUrl: 'https://github.com/example/yar/releases/download/v1.7.0/yar-1.7.0.zip',
      publishedAt: Date.now() - 1000 * 60 * 60 * 5,
      source: 'release',
      // متن آزمایشی شامل پیوند مارک‌داون و تگ HTML — باید فقط به‌صورت متن ساده دیده شود
      notes: [
        '## تازه‌ها',
        '- **به‌روزرسانی از گیت‌هاب** با اعلان و پنجرهٔ تغییرات',
        '- قیمت نقره در پاپ‌آپ',
        '',
        '## اصلاح‌ها',
        '- [ممیز فارسی](https://example.com) در درصدها',
        '<script>alert(1)</script>',
      ].join('\n'),
    },
  },
  weather: {
    data: {
      current: {
        temperature: 29.6,
        feelsLike: 28.4,
        humidity: 24,
        wind: 11,
        code: 1,
        isDay: false,
        time: '2026-08-21T01:45',
      },
      daily: [
        { date: '2026-08-21', code: 1, max: 36, min: 24, sunrise: '2026-08-21T06:18', sunset: '2026-08-21T17:19', rainChance: 5 },
        { date: '2026-08-22', code: 0, max: 37, min: 25 },
        { date: '2026-08-23', code: 2, max: 35, min: 24 },
        { date: '2026-08-24', code: 3, max: 33, min: 23 },
        { date: '2026-08-25', code: 80, max: 31, min: 22 },
        { date: '2026-08-26', code: 0, max: 34, min: 23 },
      ],
      // ۱۲ ساعت آینده از «اکنون» — برای پیش‌نمایش نوار ساعتی پنجرهٔ پیش‌بینی
      hourly: Array.from({ length: 12 }, (_, index) => {
        const at = new Date(Date.now() + index * 3600000);
        const iso = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}T${String(at.getHours()).padStart(2, '0')}:00`;
        return { time: iso, temperature: 29 - index * 0.8, code: [1, 1, 2, 3, 3, 61, 80, 2, 1, 0, 0, 0][index] };
      }),
      unit: 'celsius',
      timeZone: 'Asia/Tehran',
    },
    at: Date.now(),
    stale: false,
  },
  prices: {
    price_dollar_rl: 1894000,
    sekee: 1995400000,
    geram18: 198527000,
    silver_999: 4943900,
    silver_925: 4573150,
    'crypto-bitcoin': 72622.11,
    'crypto-tether-irr': 1892570,
    price_eur: 2212100,
  },
  news: [
    {
      title: 'نسل تازهٔ پردازنده‌های موبایل معرفی شد؛ جهش ۴۰ درصدی در کارایی گرافیکی',
      link: 'https://example.com/a',
      source: 'زومیت',
      publishedAt: Date.now() - 1000 * 60 * 24,
      image: null,
    },
    {
      title: 'راهنمای خرید مانیتور: چه چیزهایی واقعاً به کیفیت تصویر ربط دارند؟',
      link: 'https://example.com/b',
      source: 'دیجیاتو',
      publishedAt: Date.now() - 1000 * 60 * 95,
      image: null,
    },
    {
      title: 'باتری‌های حالت‌جامد یک قدم به تولید انبوه نزدیک‌تر شدند',
      link: 'https://example.com/c',
      source: 'زومیت',
      publishedAt: Date.now() - 1000 * 60 * 200,
      image: null,
    },
    {
      title: 'مرورگرها امسال چه تغییراتی در حریم خصوصی کاربران ایجاد می‌کنند؟',
      link: 'https://example.com/d',
      source: 'دیجیاتو',
      publishedAt: Date.now() - 1000 * 60 * 400,
      image: null,
    },
  ],
  topSites: [
    { url: 'https://github.com', title: 'GitHub' },
    { url: 'https://www.digikala.com', title: 'دیجی‌کالا' },
    { url: 'https://www.aparat.com', title: 'آپارات' },
    { url: 'https://mail.google.com', title: 'Gmail' },
    { url: 'https://www.varzesh3.com', title: 'ورزش سه' },
    { url: 'https://stackoverflow.com', title: 'Stack Overflow' },
  ],
  bookmarks: [
    { id: '1', title: 'نوار نشان‌ها', url: null, isFolder: true },
    { id: '2', title: 'مستندات MDN', url: 'https://developer.mozilla.org', isFolder: false },
    { id: '3', title: 'گنجور', url: 'https://ganjoor.net', isFolder: false },
  ],
};
