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
  'Access-Control-Allow-Headers': 'Content-Type'
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
    .replace(/&#39;/g, "'")
    .trim();
}

function firstMatch(block: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = block.match(pattern)?.[1];
    if (match) return cleanValue(match);
  }
  return '';
}

function extractLink(block: string): string {
  return firstMatch(block, [LINK_HREF_RE, LINK_TEXT_RE, ID_RE]);
}

function normalizeDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date(0).toISOString();
  return parsed.toISOString();
}

function getSourceName(feedUrl: string): string {
  try {
    return new URL(feedUrl).hostname;
  } catch {
    return feedUrl;
  }
}

function extractItems(xml: string, feedUrl: string): AggregatedItem[] {
  const sourceName = getSourceName(feedUrl);
  const blocks = [...xml.matchAll(ITEM_BLOCK_RE), ...xml.matchAll(ENTRY_BLOCK_RE)].map((m) => m[0]);

  return blocks
    .map((block) => {
      const title = firstMatch(block, [TITLE_RE]) || 'Untitled';
      const link = extractLink(block);
      const date = normalizeDate(firstMatch(block, [PUB_DATE_RE, UPDATED_RE, PUBLISHED_RE, DC_DATE_RE]));

      return {
        title,
        link,
        date,
        source: feedUrl,
        sourceName
      };
    })
    .filter((item) => item.link);
}

async function fetchFeed(feedUrl: string): Promise<AggregatedItem[]> {
  const response = await fetch(feedUrl, {
    headers: {
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1',
      'User-Agent': 'TechPulseWorker/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Feed request failed (${response.status}) for ${feedUrl}`);
  }

  const xml = await response.text();
  return extractItems(xml, feedUrl);
}

async function aggregate(feeds: string[]): Promise<AggregatedItem[]> {
  const settled = await Promise.allSettled(feeds.map((feed) => fetchFeed(feed)));
  const flattened = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

  const byLink = new Map<string, AggregatedItem>();

  for (const item of flattened) {
    const key = item.link.trim();
    if (!key) continue;

    const existing = byLink.get(key);
    if (!existing || new Date(item.date).getTime() > new Date(existing.date).getTime()) {
      byLink.set(key, item);
    }
  }

  return [...byLink.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return jsonResponse({ ok: true, service: 'techpulse-worker', generatedAt: new Date().toISOString() });
    }

    if (url.pathname === '/aggregate') {
      const feeds = (env.FEEDS || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

      const items = feeds.length ? await aggregate(feeds) : [];

      return jsonResponse({
        items,
        count: items.length,
        generatedAt: new Date().toISOString()
      });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }
} satisfies ExportedHandler<Env>;
