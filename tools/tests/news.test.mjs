/**
 * آزمون تجزیهٔ RSS روی خوراک واقعی.
 * chrome.storage و fetch شبیه‌سازی می‌شوند تا ماژول بدون مرورگر اجرا شود.
 */
import { readFileSync } from 'node:fs';

const store = new Map();
globalThis.chrome = {
  storage: {
    local: {
      async get(key) {
        return store.has(key) ? { [key]: store.get(key) } : {};
      },
      async set(items) {
        for (const [k, v] of Object.entries(items)) store.set(k, v);
      },
    },
  },
};

const xmlPath = process.argv[2];
if (!xmlPath) {
  console.error('usage: node tools/tests/news.test.mjs <feed.xml>');
  process.exit(2);
}
const xml = readFileSync(xmlPath, 'utf8');

globalThis.fetch = async () => ({ ok: true, status: 200, async text() { return xml; } });

const { getNews } = await import('../../src/services/news.js');
const result = await getNews([{ id: 'test', label: 'زومیت', url: 'https://example.com/feed', enabled: true }], 5);

console.log('items:', result.items.length, '| failed:', result.failed.length);
for (const item of result.items) {
  console.log('-', item.title.slice(0, 60));
  console.log('  link:', item.link.slice(0, 70));
  console.log('  date:', item.publishedAt ? new Date(item.publishedAt).toISOString() : 'null', '| image:', item.image ? 'yes' : 'no');
}

const bad = result.items.filter((i) => !i.title || !i.link || !i.publishedAt);
console.log(bad.length === 0 ? 'PASS all items complete' : `FAIL ${bad.length} incomplete items`);
process.exit(bad.length === 0 ? 0 : 1);
