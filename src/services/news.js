/**
 * خواندن خبرخوان‌های RSS/Atom.
 *
 * سرویس‌ورکر به DOMParser دسترسی ندارد، بنابراین استخراج با الگوی متنی انجام می‌شود؛
 * فقط چند فیلد مشخص از هر آیتم برداشته می‌شود و متن خام هرگز به صفحه فرستاده نمی‌شود.
 */

import { withCache, fetchWithTimeout } from './cache.js';

const TTL = 15 * 60 * 1000;
const MAX_ITEMS_PER_FEED = 12;

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

function stripTags(text) {
  return decodeEntities(String(text ?? '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function unwrapCdata(text) {
  const match = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(text ?? '');
  return match ? match[1] : (text ?? '');
}

function tagValue(block, tag) {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
  return match ? unwrapCdata(match[1]) : '';
}

function linkValue(block) {
  const plain = tagValue(block, 'link');
  if (plain && !/^\s*</.test(plain)) return plain.trim();
  const href = /<link[^>]*href=["']([^"']+)["'][^>]*>/i.exec(block);
  return href ? href[1] : '';
}

function imageValue(block) {
  const candidates = [
    /<media:(?:content|thumbnail)[^>]*url=["']([^"']+)["']/i,
    /<enclosure[^>]*url=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i,
    /<img[^>]*src=["']([^"']+)["']/i,
  ];
  for (const pattern of candidates) {
    const match = pattern.exec(block);
    if (match) return decodeEntities(match[1]);
  }
  return null;
}

function parseFeed(xml, feed) {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  return blocks.slice(0, MAX_ITEMS_PER_FEED).map((block) => {
    const published = tagValue(block, 'pubDate') || tagValue(block, 'published') || tagValue(block, 'updated');
    const timestamp = Date.parse(published);
    return {
      title: stripTags(tagValue(block, 'title')),
      link: decodeEntities(linkValue(block)).trim(),
      summary: stripTags(tagValue(block, 'description') || tagValue(block, 'summary')).slice(0, 220),
      image: imageValue(block),
      publishedAt: Number.isFinite(timestamp) ? timestamp : null,
      source: feed.label,
      sourceId: feed.id,
    };
  });
}

async function loadFeed(feed) {
  const response = await fetchWithTimeout(feed.url, {
    headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
  });
  return parseFeed(await response.text(), feed);
}

/**
 * اخبار همهٔ خبرخوان‌های فعال، ادغام‌شده و مرتب بر اساس زمان.
 * شکست یک منبع کل ویجت را از کار نمی‌اندازد؛ فقط در `failed` گزارش می‌شود.
 *
 * @param {Array<{id:string,label:string,url:string,enabled:boolean}>} feeds
 * @param {number} limit
 */
export async function getNews(feeds, limit = 8) {
  const active = feeds.filter((feed) => feed.enabled && feed.url);
  if (!active.length) return { items: [], failed: [], at: Date.now(), stale: false };

  const key = `news:${active.map((feed) => feed.url).join('|')}`;
  const result = await withCache(key, TTL, async () => {
    const settled = await Promise.allSettled(active.map(loadFeed));
    const items = [];
    const failed = [];
    settled.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled') items.push(...outcome.value);
      else failed.push({ label: active[index].label, error: outcome.reason?.message ?? 'خطا' });
    });
    if (!items.length && failed.length) throw new Error(`هیچ‌کدام از منابع خبری پاسخ ندادند`);
    items.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
    return { items, failed };
  });

  return {
    items: result.data.items.slice(0, limit),
    failed: result.data.failed,
    at: result.at,
    stale: Boolean(result.stale),
  };
}
