/**
 * شبیه‌ساز APIهای کروم برای پیش‌نمایش صفحه در مرورگر معمولی.
 * فقط ابزار توسعه است و در بستهٔ افزونه قرار نمی‌گیرد.
 */
(function mockChrome() {
  const memory = new Map();
  const listeners = [];

  const notify = (changes) => listeners.forEach((fn) => fn(changes, 'local'));

  const storageArea = {
    async get(keys) {
      const list = keys == null ? [...memory.keys()] : [].concat(keys);
      const out = {};
      for (const key of list) if (memory.has(key)) out[key] = memory.get(key);
      return out;
    },
    async set(items) {
      const changes = {};
      for (const [key, value] of Object.entries(items)) {
        changes[key] = { oldValue: memory.get(key), newValue: value };
        memory.set(key, value);
      }
      notify(changes);
    },
    async remove(keys) {
      const changes = {};
      for (const key of [].concat(keys)) {
        changes[key] = { oldValue: memory.get(key), newValue: undefined };
        memory.delete(key);
      }
      notify(changes);
    },
  };

  const fixtures = window.__YAR_FIXTURES__ ?? {};

  // حالت آغازین پیش‌نمایش: «خوش‌آمد» فقط با ?fresh، و یک نسخهٔ تازهٔ ساختگی برای دیدن توست
  if (!location.search.includes('fresh')) memory.set('yar:onboarded', true);
  if (fixtures.update && !location.search.includes('noupdate')) memory.set('yar:update', fixtures.update);

  const routes = {
    'weather:get': () => fixtures.weather,
    'market:get': (payload) => ({
      rows: (payload.symbols ?? []).map((id, index) => ({
        id,
        price: fixtures.prices?.[id] ?? 1000000 * (index + 1),
        high: (fixtures.prices?.[id] ?? 1000000 * (index + 1)) * 1.012,
        low: (fixtures.prices?.[id] ?? 1000000 * (index + 1)) * 0.991,
        updatedLabel: '۲۱:۲۰:۲۷',
        changePercent: [0.42, -1.1, 0.0, 2.35, -0.18, 0.9][index % 6],
        direction: [1, -1, 0, 1, -1, 1][index % 6],
      })),
      missing: [],
      at: Date.now(),
      stale: false,
    }),
    'news:get': () => ({ items: fixtures.news ?? [], failed: [], at: Date.now(), stale: false }),
    'search:suggest': () => [],
    'sites:top': () => fixtures.topSites ?? [],
    'bookmarks:get': () => fixtures.bookmarks ?? [],
    'bookmarks:search': (payload) =>
      (fixtures.bookmarks ?? [])
        .filter((item) => item.url && `${item.title} ${item.url}`.toLowerCase().includes(String(payload.query).toLowerCase()))
        .map(({ id, title, url }) => ({ id, title, url })),
    // تصویر نمونه به‌جای بینگ واقعی — پیش‌نمایش نباید به شبکه وابسته باشد
    'wallpaper:bing': () => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#0c4a6e'/><stop offset='.55' stop-color='#b45309'/><stop offset='1' stop-color='#14532d'/></linearGradient></defs><rect width='1920' height='1080' fill='url(#g)'/><circle cx='1450' cy='300' r='120' fill='#fde68a' opacity='.8'/></svg>`;
      const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      return { data: { url1080: url, urlUhd: url, title: 'تصویر نمونهٔ روز', copyright: 'پیش‌نمایش (© یار)', link: 'https://www.bing.com/', date: '20261023' }, at: Date.now(), stale: false };
    },
    // تاریخچهٔ ساختگی: یک گام تصادفی ثابت (با بذر از روی نام نماد) در ۷ روز گذشته
    'market:history': (payload) =>
      Object.fromEntries(
        [].concat(payload.symbols ?? []).map((id) => {
          let seed = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
          const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
          let price = fixtures.prices?.[id] ?? 1000000;
          const points = [];
          for (let hour = 168; hour >= 0; hour -= 1) {
            points.push([Date.now() - hour * 3600000, price]);
            price *= 1 + (random() - 0.48) * 0.006;
          }
          return [id, points];
        }),
      ),
    'air:get': () => ({ data: { aqi: 136, pm25: 119.7, pm10: 132.2, time: '2026-10-23T20:30' }, at: Date.now(), stale: false }),
    'update:check': () => {
      const state = { ...(fixtures.update ?? {}), checkedAt: Date.now() };
      memory.set('yar:update', state);
      notify({ 'yar:update': { newValue: state } });
      return state;
    },
    'timer:schedule': (payload) => ({ scheduled: Boolean(payload.endsAt) }),
    'geo:search': () => ({ data: [], at: Date.now(), stale: false }),
  };

  window.chrome = {
    storage: {
      local: storageArea,
      onChanged: {
        addListener: (fn) => listeners.push(fn),
        removeListener: (fn) => {
          const index = listeners.indexOf(fn);
          if (index >= 0) listeners.splice(index, 1);
        },
      },
    },
    runtime: {
      getManifest: () => ({ version: '1.6.0' }),
      reload: () => location.reload(),
      getURL: (path) => new URL(path.replace(/^\//, ''), `${location.origin}/`).toString(),
      sendMessage: async (message) => {
        const handler = routes[message.type];
        if (!handler) return { ok: false, error: `پیام ناشناخته: ${message.type}` };
        try {
          return { ok: true, data: await handler(message.payload ?? {}) };
        } catch (error) {
          return { ok: false, error: error.message };
        }
      },
    },
    tabs: { create: (options) => window.open(options.url, '_blank') },
    permissions: { request: async () => true, contains: async () => true },
  };
})();
