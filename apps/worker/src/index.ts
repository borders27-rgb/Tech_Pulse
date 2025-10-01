export interface Env {
  FEEDS: string;
}

async function fetchFeed(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": "TechPulseBot/1.0" }});
  const xml = await r.text();

  const items = [...xml.matchAll(/<(item|entry)[\s\S]*?<\/(\1)>/gi)]
    .slice(0, 10)
    .map(block => {
      const text = block[0];
      const pick = (tag: string) =>
        (text.match(new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'i'))?.[1] ?? '')
          .replace(/<!\[CDATA\[|\]\]>/g, '')
          .trim();
      const title = pick('title');
      const link =
        pick('link') ||
        (text.match(/href="([^\"]+)"/i)?.[1] ?? '');
      const date = pick('pubDate') || pick('updated') || pick('published');
      return { title, link, date, source: url };
    });
  return items;
}

async function aggregate(feeds: string[]) {
  const batches = await Promise.allSettled(feeds.map(fetchFeed));
  const all = batches.flatMap(b => (b.status === 'fulfilled' ? b.value : []));
  const seen = new Set<string>();
  return all.filter(i => i.title && !seen.has(i.title) && seen.add(i.title));
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/aggregate') {
      const feeds = (env.FEEDS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const data = await aggregate(feeds);
      return new Response(JSON.stringify({ items: data }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    return new Response('OK');
  },

  async scheduled(_event: ScheduledEvent, env: Env) {
    // optional scheduled tasks for caching etc.
  },
} satisfies ExportedHandler<Env>;
