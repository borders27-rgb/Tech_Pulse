'use client';

import { useEffect, useState } from 'react';

interface Item {
  title: string;
  link: string;
  date?: string;
  source?: string;
}

export default function Page() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    async function getData() {
      try {
        const endpoint = process.env.NEXT_PUBLIC_AGGREGATE_URL;
        if (!endpoint) return;
        const res = await fetch(endpoint, { cache: 'no-store' });
        const data = await res.json();
        setItems(data.items || []);
      } catch (err) {
        console.error(err);
      }
    }
    getData();
  }, []);

  return (
    <div className="container">
      <header className="header">
        <h1>TechPulse</h1>
        <p>Trends → Signals → Moves</p>
      </header>
      <main>
        <section className="trends">
          <h2>Trending Topics</h2>
          <div className="grid">
            {items.slice(0, 6).map((item, idx) => (
              <div key={idx} className="card">
                <a href={item.link} target="_blank" rel="noopener noreferrer">{item.title}</a>
                {item.date && <span className="date">{new Date(item.date).toLocaleString()}</span>}
              </div>
            ))}
            {items.length === 0 && <p>No trending topics available.</p>}
          </div>
        </section>
        <section className="feed">
          <h2>Unified Feed</h2>
          <ul>
            {items.map((item, idx) => (
              <li key={idx}>
                <a href={item.link} target="_blank" rel="noopener noreferrer">{item.title}</a>
                {item.date && <span className="date">{new Date(item.date).toLocaleString()}</span>}
              </li>
            ))}
            {items.length === 0 && <p>No items available.</p>}
          </ul>
        </section>
        <section className="watchlist">
          <h2>Watchlist</h2>
          <p>Add ticker (e.g., NVDA, AAPL): [Coming soon]</p>
        </section>
        <section className="alerts">
          <h2>Alerts</h2>
          <p>Set rules on novelty, mentions, and price moves. [Coming soon]</p>
        </section>
        <section className="about">
          <h2>About</h2>
          <p>TechPulse is a client-first, modular dashboard for discovering tech trends and connecting them to investable signals.</p>
          <ul>
            <li>Novelty index: momentum × recency × cross-source diversity</li>
            <li>Entity extraction: companies, tickers, themes</li>
            <li>Market link: fetch prices via stock API</li>
            <li>Alerts: threshold rules on novelty, mentions, and price moves</li>
          </ul>
        </section>
      </main>
      <footer>
        <p>&copy; {new Date().getFullYear()} TechPulse</p>
      </footer>
      <style jsx>{`
        .container {
          font-family: Arial, sans-serif;
          color: #333;
          padding: 0;
          margin: 0;
          background: #f9fafb;
          min-height: 100vh;
        }
        .header {
          background: #4f46e5;
          color: #fff;
          padding: 1.5rem;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 2rem;
        }
        .header p {
          margin: 0.5rem 0 0;
          font-size: 0.9rem;
          opacity: 0.8;
        }
        main {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
        }
        section {
          margin-bottom: 2.5rem;
        }
        h2 {
          margin-bottom: 0.75rem;
          font-size: 1.5rem;
          color: #111827;
        }
        .grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        }
        .card {
          background: #fff;
          padding: 1rem;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: box-shadow 0.2s;
        }
        .card:hover {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
        }
        .card a {
          display: block;
          font-weight: 600;
          color: #4f46e5;
          margin-bottom: 0.5rem;
          text-decoration: none;
        }
        .card .date {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .feed ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .feed li {
          margin-bottom: 0.75rem;
        }
        .feed a {
          font-weight: 600;
          color: #4f46e5;
          text-decoration: none;
        }
        .feed .date {
          margin-left: 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .about ul {
          list-style: disc;
          padding-left: 1.5rem;
        }
        footer {
          text-align: center;
          padding: 1rem;
          background: #f3f4f6;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
