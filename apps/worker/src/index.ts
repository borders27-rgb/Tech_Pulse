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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function stripCdata(value: string): string {
  return value.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getTagValue(block: string, tags: string[]): string {
  for (const tag of tags) {
    const direct = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))?.[1];
    if (direct) return decodeXmlEntities(stripCdata(direct));

    const selfClosingHref = block.match(new RegExp(`<${tag}[^>]*href=["']([^"']+)["'][^>]*/?>`, 'i'))?.[1];
    if (selfClosingHref) return decodeXmlEntities(selfClosingHref.trim());
  }
  return '';
}

function extractItems(xml: string, feedUrl: string): AggregatedItem[] {
  const sourceName = (() => {
    try {
      return new URL(feedUrl).hostname;
    } catch {
      return feedUrl;
    }
  })();

  const blocks = [
    ...xml.matchAll(/<item\b[^>]*>[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry\b[^>]*>[\s\S]*?<\/entry>/gi)
  ];

  return blocks
    .map((match) => {
      const block = match[0];
      const title = getTagValue(block, ['title']);
      const link = getTagValue(block, ['link', 'id']);
      const date = getTagValue(block, ['pubDate', 'updated', 'published', 'dc:date']);

      return {
        title: title || 'Untitled',
        link: link.trim(),
        date: date ? new Date(date).toISOString() : new Date(0).toISOString(),
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

function normalizeDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date(0).toISOString();
  return parsed.toISOString();
}

async function aggregate(feeds: string[]): Promise<AggregatedItem[]> {
  const settled = await Promise.allSettled(feeds.map((feed) => fetchFeed(feed)));
  const flattened = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

  const byLink = new Map<string, AggregatedItem>();
  for (const item of flattened) {
    const link = item.link.trim();
    if (!link) continue;

    const normalized = { ...item, date: normalizeDate(item.date) };
    const existing = byLink.get(link);

    if (!existing || new Date(normalized.date).getTime() > new Date(existing.date).getTime()) {
      byLink.set(link, normalized);
    }
  }

  return [...byLink.values()].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return jsonResponse({ ok: true, service: 'techpulse-worker', timestamp: new Date().toISOString() });
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
