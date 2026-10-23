/**
 * میان‌بُر موتور جست‌وجو داخل خود عبارت: «!y گربه» یعنی همین یک بار در یوتیوب.
 * علامت می‌تواند اول یا آخر عبارت بیاید.
 */

/** کلید کوتاه هر موتور (شناسه‌ها همان SEARCH_ENGINES هستند). */
export const BANGS = {
  g: 'google',
  b: 'bing',
  d: 'duckduckgo',
  ddg: 'duckduckgo',
  y: 'youtube',
  yt: 'youtube',
  w: 'wikipedia',
  wiki: 'wikipedia',
  t: 'torob',
  dk: 'digikala',
};

/**
 * @param {string} text
 * @returns {{engineId:string, query:string, bang:string}|null}
 */
export function parseBang(text) {
  const trimmed = String(text ?? '').trim();
  const match = /^!(\w+)\s+(.+)$/.exec(trimmed) ?? /^(.+?)\s+!(\w+)$/.exec(trimmed);
  if (!match) return null;
  const [bang, query] = trimmed.startsWith('!') ? [match[1], match[2]] : [match[2], match[1]];
  const engineId = BANGS[bang.toLowerCase()];
  return engineId ? { engineId, query: query.trim(), bang: bang.toLowerCase() } : null;
}
