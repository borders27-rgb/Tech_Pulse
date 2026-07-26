import { analyzeCapex } from './capex';

export interface Env {
  FEEDS: string;
}

type AggregatedItem = {
  title: string;
  link: string;
  date: string;
  source: string;
  sourceName: string;
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=60, s-maxage=300'
};

const ITEM_BLOCK_RE = /<item\b[^>]*>[\s\S]*?<\/item>/gi;
const ENTRY_BLOCK_RE = /<entry\b[^>]*>[\s\S]*?<\/entry>/gi;
const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const LINK_TEXT_RE = /<link[^>]*>([\s\S]*?)<\/link>/i;
const LINK_HREF_RE = /<link[^>]*href=["']([^"']+)["'][^>]*\/?>(?:<\/link>)?/i;
const ID_RE = /<id[^>]*>([\s\S]*?)<\/id>/i;
const PUB_DATE_RE = /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i;
const UPDATED_RE = /<updated[^>]*>([\s\S]*?)<\/updated>/i;
const PUBLISHED_RE = /<published[^>]*>([\s\S]*?)<\/published>/i;
const DC_DATE_RE = /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function cleanValue(value: string): string {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch(block: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = block.match(pattern)?.[1];
    if (match) return cleanValue(match);
  }
  return '';
}

function canonicalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|ref$|source$|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return '';
  }
}

function normalizeDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date(0).toISOString();
  return parsed.toISOString();
}

function getSourceName(feedUrl: string): string {
  try {
    return new URL(feedUrl).hostname.replace(/^www\./, '');
  } catch {
    return feedUrl;
  }
}

function extractItems(xml: string, feedUrl: string): AggregatedItem[] {
  const sourceName = getSourceName(feedUrl);
  const blocks = [...xml.matchAll(ITEM_BLOCK_RE), ...xml.matchAll(ENTRY_BLOCK_RE)].map((match) => match[0]);

  return blocks
    .map((block) => ({
      title: firstMatch(block, [TITLE_RE]) || 'Untitled',
      link: canonicalizeUrl(firstMatch(block, [LINK_HREF_RE, LINK_TEXT_RE, ID_RE])),
      date: normalizeDate(firstMatch(block, [PUB_DATE_RE, UPDATED_RE, PUBLISHED_RE, DC_DATE_RE])),
      source: feedUrl,
      sourceName
    }))
    .filter((item) => item.link);
}

async function fetchFeed(feedUrl: string): Promise<AggregatedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1',
        'User-Agent': 'TechPulseWorker/1.1 (+https://github.com/borders27-rgb/Tech_Pulse)'
      }
    });
    if (!response.ok) throw new Error(`Feed request failed (${response.status}) for ${feedUrl}`);
    return extractItems(await response.text(), feedUrl);
  } finally {
    clearTimeout(timeout);
  }
}

function parseFeeds(raw: string): string[] {
  const valid = new Set<string>();
  for (const entry of (raw || '').split(',')) {
    const value = entry.trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' || url.protocol === 'http:') valid.add(url.toString());
    } catch {
      // Ignore malformed configuration entries.
    }
  }
  return [...valid].slice(0, 40);
}

async function aggregate(feeds: string[]): Promise<AggregatedItem[]> {
  const settled = await Promise.allSettled(feeds.map((feed) => fetchFeed(feed)));
  const flattened = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  const byLink = new Map<string, AggregatedItem>();
  for (const item of flattened) {
    const existing = byLink.get(item.link);
    if (!existing || new Date(item.date).getTime() > new Date(existing.date).getTime()) byLink.set(item.link, item);
  }
  return [...byLink.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);

    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return jsonResponse({ ok: true, service: 'techpulse-worker', generatedAt: new Date().toISOString() });
    }

    if (url.pathname === '/aggregate' || url.pathname === '/capex-monitor') {
      const feeds = parseFeeds(env.FEEDS);
      const items = feeds.length ? await aggregate(feeds) : [];
      if (url.pathname === '/capex-monitor') return jsonResponse(analyzeCapex(items));
      return jsonResponse({ items, count: items.length, generatedAt: new Date().toISOString() });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }
} satisfies ExportedHandler<Env>;
