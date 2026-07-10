export interface Env {
  FEEDS?: string;
  CORS_ORIGIN?: string;
}

type AggregatedItem = {
  title: string;
  link: string;
  date: string;
  source: string;
  sourceName: string;
};

type FeedResult = {
  feed: string;
  ok: boolean;
  itemCount: number;
  error?: string;
};

const MAX_FEEDS = 40;
const MAX_RESPONSE_BYTES = 2_000_000;
const FEED_TIMEOUT_MS = 8_000;

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

function headers(env: Env): HeadersInit {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=60, s-maxage=300'
  };
}

function jsonResponse(env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: headers(env) });
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

function normalizeDate(value: string): string {
  if (!value) return new Date(0).toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
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

function sourceName(feedUrl: string): string {
  try {
    return new URL(feedUrl).hostname.replace(/^www\./, '');
  } catch {
    return feedUrl;
  }
}

function extractItems(xml: string, feedUrl: string): AggregatedItem[] {
  const blocks = [...xml.matchAll(ITEM_BLOCK_RE), ...xml.matchAll(ENTRY_BLOCK_RE)].map((match) => match[0]);

  return blocks
    .map((block) => {
      const link = canonicalizeUrl(firstMatch(block, [LINK_HREF_RE, LINK_TEXT_RE, ID_RE]));
      return {
        title: firstMatch(block, [TITLE_RE]) || 'Untitled',
        link,
        date: normalizeDate(firstMatch(block, [PUB_DATE_RE, UPDATED_RE, PUBLISHED_RE, DC_DATE_RE])),
        source: feedUrl,
        sourceName: sourceName(feedUrl)
      };
    })
    .filter((item) => item.link);
}

function parseFeeds(raw: string | undefined): string[] {
  const unique = new Set<string>();
  for (const value of (raw || '').split(',')) {
    const feed = value.trim();
    if (!feed) continue;
    try {
      const url = new URL(feed);
      if (url.protocol === 'https:' || url.protocol === 'http:') unique.add(url.toString());
    } catch {
      // Ignore malformed configuration entries instead of failing the entire service.
    }
  }
  return [...unique].slice(0, MAX_FEEDS);
}

async function fetchFeed(feedUrl: string): Promise<AggregatedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  try {
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1',
        'User-Agent': 'TechPulseWorker/1.0 (+https://github.com/borders27-rgb/Tech_Pulse)'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) throw new Error('Feed exceeded size limit');

    const xml = await response.text();
    if (new TextEncoder().encode(xml).byteLength > MAX_RESPONSE_BYTES) {
      throw new Error('Feed exceeded size limit');
    }

    return extractItems(xml, feedUrl);
  } finally {
    clearTimeout(timeout);
  }
}

async function aggregate(feeds: string[]): Promise<{ items: AggregatedItem[]; sources: FeedResult[] }> {
  const settled = await Promise.allSettled(feeds.map((feed) => fetchFeed(feed)));
  const byLink = new Map<string, AggregatedItem>();
  const sources: FeedResult[] = [];

  settled.forEach((result, index) => {
    const feed = feeds[index];
    if (result.status === 'rejected') {
      sources.push({ feed, ok: false, itemCount: 0, error: result.reason instanceof Error ? result.reason.message : 'Unknown error' });
      return;
    }

    sources.push({ feed, ok: true, itemCount: result.value.length });
    for (const item of result.value) {
      const existing = byLink.get(item.link);
      if (!existing || new Date(item.date).getTime() > new Date(existing.date).getTime()) {
        byLink.set(item.link, item);
      }
    }
  });

  const items = [...byLink.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { items, sources };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(env) });
    if (request.method !== 'GET') return jsonResponse(env, { error: 'Method not allowed' }, 405);

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return jsonResponse(env, { ok: true, service: 'techpulse-worker', generatedAt: new Date().toISOString() });
    }

    if (url.pathname === '/aggregate') {
      const feeds = parseFeeds(env.FEEDS);
      if (!feeds.length) {
        return jsonResponse(env, { error: 'No valid feeds configured', items: [], count: 0, sources: [], generatedAt: new Date().toISOString() }, 503);
      }

      const { items, sources } = await aggregate(feeds);
      return jsonResponse(env, {
        items,
        count: items.length,
        sources,
        sourceCount: sources.length,
        failedSourceCount: sources.filter((source) => !source.ok).length,
        generatedAt: new Date().toISOString()
      });
    }

    return jsonResponse(env, { error: 'Not found' }, 404);
  }
} satisfies ExportedHandler<Env>;
