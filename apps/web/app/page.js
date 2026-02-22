'use client';

import React, { useEffect, useMemo, useState } from 'react';

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const normalize = (n, min = 0, max = 100) => clamp(((n - min) / (max - min)) * 100);
const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const SOURCE_ICON = { News: '📰', YouTube: '▶️', Reddit: '💬', HN: '#️⃣', X: '🔗' };
const SOURCE_CREDIBILITY = { News: 85, HN: 80, YouTube: 65, Reddit: 55, X: 50 };
const TOPIC_KEYWORDS = {
  'AI Agents': ['agent', 'autonomous', 'workflow'],
  'LLM Infrastructure': ['inference', 'vector', 'orchestration', 'llm'],
  Semiconductors: ['chip', 'semiconductor', 'fab', 'nm'],
  Robotics: ['robot', 'humanoid', 'automation'],
  'Battery Tech': ['battery', 'solid-state', 'lithium']
};

function extractTopics(text) {
  const t = text.toLowerCase();
  return Object.entries(TOPIC_KEYWORDS).filter(([, keys]) => keys.some((k) => t.includes(k))).map(([name]) => name);
}
function extractSignals(text) {
  const t = text.toLowerCase();
  return { fundingHint: /raised|series|funding/.test(t), supplyChainHint: /supplier|manufactur|fab|partnered/.test(t) };
}

const COMPANIES = ['OpenAI', 'NVIDIA', 'AMD', 'Tesla', 'Anthropic', 'Google', 'Amazon', 'Microsoft', 'TSMC'];
const TREND_DEFS = [
  { id: 't1', name: 'AI Agents', desc: 'Autonomous systems coordinating tasks.' },
  { id: 't2', name: 'LLM Infrastructure', desc: 'Scaling inference and orchestration.' },
  { id: 't3', name: 'Semiconductors', desc: 'Advanced nodes and supply chains.' },
  { id: 't4', name: 'Robotics', desc: 'Humanoid and industrial automation.' },
  { id: 't5', name: 'Battery Tech', desc: 'Next-gen energy storage.' },
  { id: 't6', name: 'Privacy & Security', desc: 'Data protection and zero trust.' }
];

function makeFeed() {
  const sources = ['News', 'YouTube', 'Reddit', 'HN', 'X'];
  return Array.from({ length: 48 }).map((_, i) => {
    const trend = pick(TREND_DEFS);
    const source = pick(sources);
    const title = `${trend.name} update: ${pick(['new funding round', 'performance surge', 'partnered with supplier', 'launches v2'])}`;
    const summary = `${pick(COMPANIES)} reports ${pick(['raised capital', 'supply chain expansion', 'rapid adoption', 'new architecture'])} impacting ${trend.name}.`;
    const sig = extractSignals(`${title} ${summary}`);
    const topics = extractTopics(`${title} ${summary}`);
    return {
      id: `f${i}`,
      title,
      summary,
      source: { type: source },
      publishedAt: daysAgo(rand(0, 30)),
      entities: [pick(COMPANIES)],
      topics: topics.length ? topics : [trend.name],
      signals: {
        velocity: rand(30, 95), mentions: rand(5, 120), novelty: rand(30, 95), credibility: SOURCE_CREDIBILITY[source],
        supplyChainHint: Boolean(sig.supplyChainHint), fundingHint: Boolean(sig.fundingHint)
      },
      trendId: trend.id
    };
  });
}

function computeTrends(feed) {
  return TREND_DEFS.map((t) => {
    const items = feed.filter((f) => f.trendId === t.id);
    const velocity = items.reduce((a, b) => a + b.signals.velocity, 0) / Math.max(1, items.length);
    const mentions = items.reduce((a, b) => a + b.signals.mentions, 0);
    const novelty = items.reduce((a, b) => a + b.signals.novelty, 0) / Math.max(1, items.length);
    const credibility = items.reduce((a, b) => a + b.signals.credibility, 0) / Math.max(1, items.length);
    const diversity = new Set(items.map((i) => i.source.type)).size * 20;
    const momentum = normalize(velocity + mentions / 5);
    const score = clamp(0.35 * momentum + 0.35 * normalize(novelty) + 0.2 * normalize(credibility) + 0.1 * normalize(diversity));
    return {
      id: t.id,
      name: t.name,
      description: t.desc,
      score,
      breakdown: { momentum, novelty: normalize(novelty), credibility: normalize(credibility), diversity: normalize(diversity) },
      timeseries: Array.from({ length: 14 }).map((__, i) => ({ date: `D-${13 - i}`, score: clamp(score + rand(-10, 10)) })),
      topSignals: [items.some((i) => i.signals.fundingHint) && 'Funding Hint', items.some((i) => i.signals.supplyChainHint) && 'Supply Chain Signal'].filter(Boolean)
    };
  });
}

const card = { border: '1px solid #e5e7eb', borderRadius: 12, background: 'var(--card)', color: 'var(--text)' };
const btn = { border: '1px solid #cbd5e1', background: 'white', borderRadius: 8, padding: '8px 10px', cursor: 'pointer' };

export default function Page() {
  const [dark, setDark] = useState(false);
  const [feed, setFeed] = useState(() => makeFeed());
  const [tab, setTab] = useState('dashboard');
  const trends = useMemo(() => computeTrends(feed), [feed]);
  const [activeTrend, setActiveTrend] = useState('t1');
  const active = trends.find((t) => t.id === activeTrend) || trends[0];
  const sourceMix = useMemo(() => {
    const map = {}; feed.forEach((f) => (map[f.source.type] = (map[f.source.type] || 0) + 1)); return map;
  }, [feed]);

  useEffect(() => {
    document.body.style.margin = '0';
    document.documentElement.style.setProperty('--bg', dark ? '#0b1020' : '#f8fafc');
    document.documentElement.style.setProperty('--card', dark ? '#141b2e' : '#ffffff');
    document.documentElement.style.setProperty('--text', dark ? '#f8fafc' : '#0f172a');
    document.documentElement.style.setProperty('--muted', dark ? '#9ca3af' : '#64748b');
  }, [dark]);

  return <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'Inter, Arial, sans-serif' }}>
    <div style={{ position: 'sticky', top: 0, borderBottom: '1px solid #33415533', background: '#ffffff66', backdropFilter: 'blur(6px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
        <strong style={{ fontSize: 24 }}>TechPulse</strong>
        <div style={{ flex: 1, textAlign: 'center' }}><input placeholder='Search trends, topics, companies' style={{ width: '50%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }} /></div>
        <button onClick={() => setFeed(makeFeed())} style={btn}>⟳ Refresh</button>
        <button onClick={() => setDark((d) => !d)} style={btn}>{dark ? '☀️' : '🌙'}</button>
      </div>
    </div>
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>{['dashboard', 'trends', 'feed', 'sources', 'settings'].map((t) => <button key={t} onClick={() => setTab(t)} style={{ ...btn, background: tab === t ? '#2563eb' : 'transparent', color: tab === t ? '#fff' : 'var(--text)' }}>{t}</button>)}</div>
      {tab === 'dashboard' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          <KPI title='Active Trends' value={trends.length} icon='🧱' />
          <KPI title='Highest Momentum' value={Math.round(Math.max(...trends.map((t) => t.breakdown.momentum)))} icon='📈' />
          <KPI title='Highest Novelty' value={Math.round(Math.max(...trends.map((t) => t.breakdown.novelty)))} icon='✨' />
          <KPI title='Top Credibility' value={Math.round(Math.max(...trends.map((t) => t.breakdown.credibility)))} icon='🛡️' />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div style={{ ...card, padding: 14 }}>
            <h3>Trend Momentum</h3>
            <select value={activeTrend} onChange={(e) => setActiveTrend(e.target.value)}>{trends.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <MiniLine data={active.timeseries} />
          </div>
          <div style={{ ...card, padding: 14 }}><h3>Source Mix</h3>{Object.entries(sourceMix).map(([k, v]) => <div key={k}>{k}: {v}</div>)}</div>
        </div>
      </>}
      {tab === 'trends' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>{trends.map((t) => <TrendCard key={t.id} trend={t} />)}</div>}
      {tab === 'feed' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>{feed.map((f) => <div key={f.id} style={{ ...card, padding: 12 }}><div>{SOURCE_ICON[f.source.type]} {f.source.type}</div><strong>{f.title}</strong><p>{f.summary}</p></div>)}</div>}
      {tab === 'sources' && ['News', 'YouTube', 'Reddit', 'HN', 'X'].map((s) => <div key={s} style={{ ...card, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}><span>{s}</span><span>Connected</span></div>)}
      {tab === 'settings' && <div style={{ ...card, padding: 14 }}><h3>Extraction Settings</h3><input type='range' defaultValue={50} /><input type='range' defaultValue={50} /><input type='range' defaultValue={50} /></div>}
    </div>
  </main>;
}

function KPI({ title, value, icon }) { return <div style={{ ...card, padding: 12 }}><div>{icon} {title}</div><strong style={{ fontSize: 28 }}>{value}</strong></div>; }
function TrendCard({ trend }) { return <div style={{ ...card, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{trend.name}</strong><span>{Math.round(trend.score)}</span></div><p style={{ color: 'var(--muted)' }}>{trend.description}</p><small>{trend.topSignals.join(' · ') || 'No highlighted signals'}</small></div>; }
function MiniLine({ data }) {
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - d.score}`).join(' ');
  return <svg viewBox='0 0 100 100' style={{ width: '100%', height: 220, background: '#f1f5f9', borderRadius: 8 }}><polyline fill='none' stroke='#2563eb' strokeWidth='2' points={points} /></svg>;
}
