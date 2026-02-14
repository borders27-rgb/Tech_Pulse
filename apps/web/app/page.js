'use client';
import { useEffect, useMemo, useState } from 'react';

const FEEDS = [
  'https://techcrunch.com/feed/',
  'https://feeds.arstechnica.com/arstechnica/index',
  'https://www.theverge.com/rss/index.xml',
  'https://hnrss.org/frontpage',
  'https://www.reddit.com/r/MachineLearning/.rss',
  'https://www.reddit.com/r/technology/.rss',
  'https://www.wired.com/feed/rss',
  'https://feeds.bloomberg.com/bloomberg/technologynews',
  'https://www.fastcompany.com/rss',
  'https://www.engadget.com/rss.xml'
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'your', 'are', 'new', 'how', 'why',
  'not', 'but', 'you', 'all', 'its', 'has', 'have', 'will', 'can', 'more', 'about', 'after', 'over',
  'under', 'what', 'when', 'where', 'their', 'they', 'them', 'than', 'out', 'top', 'best', 'was',
  'were', 'our', 'his', 'her', 'she', 'him', 'who', 'just', 'get', 'big', 'tech', 'news'
]);

const COMPANY_INTELLIGENCE = {
  nvidia: {
    industry: 'Semiconductors / AI Infrastructure',
    ceo: 'Jensen Huang',
    board: 'Tench Coxe, Mark Stevens, Dawn Hudson and others',
    vision: 'Accelerate computing for AI, robotics, and simulation.',
    strategy: 'Own the full-stack AI platform from chips to developer tooling.',
    hotPickReason: 'AI demand continues to drive data-center momentum and pricing power.'
  },
  openai: {
    industry: 'Artificial Intelligence Platforms',
    ceo: 'Sam Altman',
    board: 'Bret Taylor (chair), Larry Summers, Adam D’Angelo and others',
    vision: 'Build safe and broadly useful AI systems.',
    strategy: 'Ship high-utility models and ecosystem tools across enterprise and consumer apps.',
    hotPickReason: 'Rapid enterprise adoption and ecosystem lock-in around AI assistants.'
  },
  microsoft: {
    industry: 'Cloud & Enterprise Software',
    ceo: 'Satya Nadella',
    board: 'John W. Thompson, Reid Hoffman, Emma Walmsley and others',
    vision: 'Empower every person and organization to achieve more.',
    strategy: 'Embed AI copilots into productivity and cloud workflows.',
    hotPickReason: 'AI + cloud bundling strengthens platform stickiness and recurring revenue.'
  },
  meta: {
    industry: 'Consumer Internet / Social / AI',
    ceo: 'Mark Zuckerberg',
    board: 'Marc Andreessen, Peggy Alford, Nancy Killefer and others',
    vision: 'Advance social connection and immersive digital experiences.',
    strategy: 'Invest heavily in open AI models and ad-tech optimization.',
    hotPickReason: 'AI-driven engagement and ad performance are improving monetization.'
  },
  default: {
    industry: 'Emerging Technology',
    ceo: 'N/A',
    board: 'N/A',
    vision: 'Use innovation to solve high-value market problems.',
    strategy: 'Scale product-market fit while compounding data advantages.',
    hotPickReason: 'Signal velocity and source diversity suggest increasing market attention.'
  }
};

async function fetchFeed(url) {
  const proxy = 'https://api.allorigins.win/raw?url=';
  const response = await fetch(proxy + encodeURIComponent(url));
  const text = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  const entries = Array.from(xml.querySelectorAll('item, entry'));
  return entries.map((entry) => {
    const titleNode = entry.querySelector('title');
    const linkNode = entry.querySelector('link');
    const pubNode = entry.querySelector('pubDate') || entry.querySelector('updated') || entry.querySelector('published');
    const sourceNode = entry.querySelector('source') || entry.querySelector('author');
    const linkHref = linkNode?.getAttribute('href');
    return {
      title: titleNode?.textContent?.trim() || '',
      link: linkHref || linkNode?.textContent?.trim() || '',
      pubDate: pubNode ? new Date(pubNode.textContent.trim()) : null,
      source: sourceNode?.textContent?.trim() || new URL(url).hostname.replace('www.', '')
    };
  });
}

function extractKeywords(items) {
  const frequency = new Map();
  items.forEach((item) => {
    const normalized = item.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

    normalized.forEach((token) => {
      frequency.set(token, (frequency.get(token) || 0) + 1);
    });
  });

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 26)
    .map(([term, count]) => ({ term, count }));
}

function estimateMomentum(items, keyword) {
  const matchCount = items.filter((item) => item.title.toLowerCase().includes(keyword)).length;
  return Math.min(100, 35 + matchCount * 11);
}

function companyFromText(text) {
  const lower = text.toLowerCase();
  const known = Object.keys(COMPANY_INTELLIGENCE).find((name) => name !== 'default' && lower.includes(name));
  return known || 'default';
}

export default function Page() {
  const [items, setItems] = useState([]);
  const [selectedKeyword, setSelectedKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    async function load() {
      const all = [];
      for (const feed of FEEDS) {
        try {
          const feedItems = await fetchFeed(feed);
          all.push(...feedItems);
        } catch (err) {
          console.error('Failed to fetch feed:', feed, err);
        }
      }

      all.sort((a, b) => {
        const aTime = a.pubDate ? a.pubDate.getTime() : 0;
        const bTime = b.pubDate ? b.pubDate.getTime() : 0;
        return bTime - aTime;
      });
      setItems(all.slice(0, 120));
    }
    load();
  }, []);

  const keywords = useMemo(() => extractKeywords(items), [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const byKeyword = selectedKeyword ? item.title.toLowerCase().includes(selectedKeyword) : true;
      const bySearch = search ? item.title.toLowerCase().includes(search.toLowerCase()) : true;
      return byKeyword && bySearch;
    });
  }, [items, search, selectedKeyword]);

  const researchCard = useMemo(() => {
    if (!selectedArticle) {
      return null;
    }
    const companyKey = companyFromText(selectedArticle.title);
    const profile = COMPANY_INTELLIGENCE[companyKey] || COMPANY_INTELLIGENCE.default;
    return {
      company: companyKey === 'default' ? 'Emerging Company (inferred)' : companyKey[0].toUpperCase() + companyKey.slice(1),
      momentumScore: estimateMomentum(items, selectedKeyword || companyKey),
      ...profile
    };
  }, [selectedArticle, items, selectedKeyword]);

  return (
    <main style={{ maxWidth: 1150, margin: '30px auto', padding: '0 16px', fontFamily: 'Inter, Arial, sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>TechPulse Discovery Sandbox</h1>
      <p style={{ marginTop: 0, color: '#4b5563' }}>
        Explore momentum signals: pick keywords from the cloud, search headlines, then open an article to generate company research context.
      </p>

      <section style={{ background: '#f8fafc', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Interactive keyword cloud</h2>
        {keywords.length === 0 ? (
          <p>Loading trend vocabulary...</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {keywords.map((keyword) => {
              const size = 12 + keyword.count * 2;
              const active = selectedKeyword === keyword.term;
              return (
                <button
                  key={keyword.term}
                  onClick={() => setSelectedKeyword(active ? '' : keyword.term)}
                  style={{
                    fontSize: `${size}px`,
                    borderRadius: 999,
                    border: active ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
                    padding: '6px 12px',
                    background: active ? '#dbeafe' : 'white',
                    color: '#1f2937',
                    cursor: 'pointer'
                  }}
                >
                  {keyword.term} ({keyword.count})
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <input
              placeholder='Search keywords (e.g., ai chips, robotics, startup)'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px' }}
            />
            {selectedKeyword && (
              <button onClick={() => setSelectedKeyword('')} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'white' }}>
                Clear “{selectedKeyword}”
              </button>
            )}
          </div>

          <h3 style={{ marginTop: 0 }}>Signal feed ({filteredItems.length})</h3>
          <div style={{ maxHeight: 520, overflow: 'auto' }}>
            {filteredItems.slice(0, 45).map((item, idx) => (
              <article
                key={`${item.link}-${idx}`}
                onClick={() => setSelectedArticle(item)}
                style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  marginBottom: 6,
                  border: selectedArticle?.link === item.link ? '1px solid #2563eb' : '1px solid transparent',
                  background: selectedArticle?.link === item.link ? '#eff6ff' : 'transparent',
                  cursor: 'pointer'
                }}
              >
                <a href={item.link} target='_blank' rel='noopener noreferrer' style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}>
                  {item.title}
                </a>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 3 }}>
                  {item.source} • {item.pubDate ? item.pubDate.toLocaleString() : 'Unknown date'}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, background: '#fcfcfd' }}>
          <h3 style={{ marginTop: 0 }}>Research presentation</h3>
          {!selectedArticle ? (
            <p style={{ color: '#6b7280' }}>Select a keyword + article to generate company/industry context.</p>
          ) : (
            <>
              <p style={{ marginTop: 0 }}><strong>Selected article:</strong> {selectedArticle.title}</p>
              <p style={{ marginBottom: 6 }}><strong>Company:</strong> {researchCard.company}</p>
              <p style={{ margin: '6px 0' }}><strong>Industry:</strong> {researchCard.industry}</p>
              <p style={{ margin: '6px 0' }}><strong>CEO:</strong> {researchCard.ceo}</p>
              <p style={{ margin: '6px 0' }}><strong>Board:</strong> {researchCard.board}</p>
              <p style={{ margin: '6px 0' }}><strong>Vision:</strong> {researchCard.vision}</p>
              <p style={{ margin: '6px 0' }}><strong>Strategy:</strong> {researchCard.strategy}</p>
              <p style={{ margin: '6px 0 14px' }}><strong>Why hot:</strong> {researchCard.hotPickReason}</p>

              <div style={{ background: '#eef2ff', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Momentum score</div>
                <div style={{ fontSize: '1.25rem' }}>{researchCard.momentumScore}/100</div>
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
