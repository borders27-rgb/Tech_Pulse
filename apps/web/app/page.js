'use client';

import { useEffect, useMemo, useState } from 'react';

const AGGREGATE_URL =
  process.env.TECHPULSE_AGGREGATE_URL || process.env.NEXT_PUBLIC_AGGREGATE_URL;

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(date);
}

function inferSourceType(item) {
  const haystack = `${item.source || ''} ${item.sourceName || ''}`.toLowerCase();
  if (haystack.includes('reddit.com') || haystack.includes('redd.it')) return 'Reddit';
  if (haystack.includes('youtube.com') || haystack.includes('youtu.be')) return 'YouTube';
  if (haystack.includes('news.ycombinator.com') || haystack.includes('hn')) return 'HN';
  return 'News';
}

export default function Page() {
  const [data, setData] = useState({ items: [], count: 0, generatedAt: null });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAggregate() {
      if (!AGGREGATE_URL) {
        setError(
          'Missing TECHPULSE_AGGREGATE_URL (or NEXT_PUBLIC_AGGREGATE_URL). Set it in apps/web/.env.local or repo variables.'
        );
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(AGGREGATE_URL, {
          cache: 'no-store',
          headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`Worker request failed (${response.status} ${response.statusText}).`);
        }

        const payload = await response.json();
        const items = Array.isArray(payload?.items) ? payload.items : [];

        setData({
          items,
          count: typeof payload?.count === 'number' ? payload.count : items.length,
          generatedAt: payload?.generatedAt || null
        });
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to reach aggregate endpoint.');
      } finally {
        setLoading(false);
      }
    }

    loadAggregate();
  }, []);

  const sourceMix = useMemo(() => {
    return data.items.reduce((acc, item) => {
      const label = inferSourceType(item);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
  }, [data.items]);

  const latestItemDate = useMemo(() => {
    return data.items
      .map((item) => new Date(item.date))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())[0];
  }, [data.items]);

  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        padding: '2rem',
        background: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      <section style={{ maxWidth: 1000, margin: '0 auto' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '2rem' }}>TechPulse</h1>
          <p style={{ marginTop: '.5rem', color: '#475569' }}>
            Canonical frontend from <code>apps/web/app/page.js</code> using live Worker aggregate data.
          </p>
        </header>

        {error && (
          <div
            style={{
              border: '1px solid #fecaca',
              background: '#fff1f2',
              color: '#991b1b',
              borderRadius: 12,
              padding: '1rem',
              marginBottom: '1rem'
            }}
          >
            <strong>Data unavailable:</strong> {error}
          </div>
        )}

        <section
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            marginBottom: '1.5rem'
          }}
        >
          <StatCard label="Status" value={loading ? 'Loading…' : 'Live'} />
          <StatCard label="Item count" value={String(data.count || 0)} />
          <StatCard
            label="Source mix"
            value={
              Object.keys(sourceMix).length
                ? Object.entries(sourceMix)
                    .map(([name, count]) => `${name}: ${count}`)
                    .join(' • ')
                : 'No sources yet'
            }
          />
          <StatCard
            label="Latest item date"
            value={latestItemDate ? formatDate(latestItemDate.toISOString()) : 'No items'}
          />
          <StatCard
            label="Generated at"
            value={data.generatedAt ? formatDate(data.generatedAt) : 'Unknown'}
          />
        </section>

        <section
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
          }}
        >
          {data.items.map((item, index) => (
            <article
              key={`${item.link || item.title || 'item'}-${index}`}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '1rem',
                background: '#ffffff'
              }}
            >
              <div style={{ fontSize: '.85rem', color: '#64748b', marginBottom: '.5rem' }}>
                {inferSourceType(item)} · {item.sourceName || 'Unknown source'}
              </div>
              <h2 style={{ marginTop: 0, fontSize: '1.05rem', lineHeight: 1.4 }}>
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noreferrer" style={{ color: '#0f172a' }}>
                    {item.title || 'Untitled'}
                  </a>
                ) : (
                  item.title || 'Untitled'
                )}
              </h2>
              <div style={{ color: '#64748b', fontSize: '.85rem' }}>
                {formatDate(item.date)} · {item.source || 'Unknown feed'}
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '1rem',
        background: '#ffffff'
      }}
    >
      <div style={{ color: '#64748b', fontSize: '.85rem', marginBottom: '.25rem' }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}
