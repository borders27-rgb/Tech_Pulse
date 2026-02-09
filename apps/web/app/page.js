'use client';
import { useEffect, useState } from 'react';

const FEEDS = [
  'https://techcrunch.com/feed/',
  'https://feeds.arstechnica.com/arstechnica/index',
  'https://www.theverge.com/rss/index.xml',
  'https://hnrss.org/frontpage',
  'https://www.reddit.com/r/MachineLearning/.rss',
  'https://www.reddit.com/r/technology/.rss',
  'https://www.wired.com/feed/rss',
  'https://www.bgr.com/feed/',
  'https://gizmodo.com/rss',
  'https://feeds.bloomberg.com/bloomberg/technologynews',
  'https://9to5mac.com/feed/',
  'http://feeds.businessinsider.com/businessinsider',
  'https://www.pcmag.com/feed',
  'http://feeds.reuters.com/reuters/technologyNews',
  'http://feeds.mashable.com/Mashable',
  'https://www.esquire.com/rss/all.xml',
  'https://www.cultofmac.com/feed/',
  'https://www.nytimes.com/wirecutter/feed/',
  'https://www.cnet.com/rss/news/',
  'https://feeds.marketwatch.com/marketwatch/topstories/',
  'https://www.macrumors.com/rss.php',
  'https://www.engadget.com/rss.xml',
  'http://fortune.com/feed/',
  'https://www.fastcompany.com/rss',
  'https://www.pcgamer.com/rss/'
];

async function fetchFeed(url) {
  const proxy = 'https://api.allorigins.win/raw?url=';
  const response = await fetch(proxy + encodeURIComponent(url));
  const text = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  const entries = Array.from(xml.querySelectorAll('item, entry'));
  return entries.map(entry => {
    const titleNode = entry.querySelector('title');
    const linkNode = entry.querySelector('link');
    const pubNode = entry.querySelector('pubDate') || entry.querySelector('updated') || entry.querySelector('published');
    const linkHref = linkNode?.getAttribute('href');
    return {
      title: titleNode?.textContent?.trim() || '',
      link: linkHref || linkNode?.textContent?.trim() || '',
      pubDate: pubNode ? new Date(pubNode.textContent.trim()) : null
    };
  });
}

export default function Page() {
  const [items, setItems] = useState([]);
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
      setItems(all.slice(0, 50));
    }
    load();
  }, []);
  return (
    <main style={{ maxWidth: '800px', margin: '40px auto', fontFamily: 'Arial, sans-serif', lineHeight: 1.5 }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '20px' }}>TechPulse Signals</h1>
      {items.length === 0 ? (
        <p>Loading tech signals...</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '8px' }}>
              <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: '#0366d6', textDecoration: 'none' }}>
                {item.title}
              </a>
              {item.pubDate && (
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#6a737d', marginTop: '4px' }}>
                  {item.pubDate.toLocaleString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
