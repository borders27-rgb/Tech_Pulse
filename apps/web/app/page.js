export const dynamic = 'force-dynamic';

const AGGREGATE_URL = process.env.TECHPULSE_AGGREGATE_URL || process.env.NEXT_PUBLIC_AGGREGATE_URL;

function monitorUrl() {
  if (!AGGREGATE_URL) return '';
  return AGGREGATE_URL.includes('/aggregate')
    ? AGGREGATE_URL.replace('/aggregate', '/capex-monitor')
    : `${AGGREGATE_URL.replace(/\/$/, '')}/capex-monitor`;
}

async function fetchMonitor() {
  const url = monitorUrl();
  if (!url) return { ok: false, error: 'Missing TECHPULSE_AGGREGATE_URL.', data: null };
  try {
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) return { ok: false, error: `Monitor request failed (${response.status}).`, data: null };
    return { ok: true, error: '', data: await response.json() };
  } catch {
    return { ok: false, error: 'Unable to reach the TechPulse Worker.', data: null };
  }
}

const stateStyles = {
  NO_SIGNAL: { bg: '#e2e8f0', fg: '#334155' },
  WATCH: { bg: '#fef3c7', fg: '#92400e' },
  RISK_RISING: { bg: '#fee2e2', fg: '#991b1b' },
  BULLISH_SPEND: { bg: '#dcfce7', fg: '#166534' }
};

export default async function Page() {
  const result = await fetchMonitor();
  const data = result.data;
  const state = data?.state || 'NO_SIGNAL';
  const tone = stateStyles[state] || stateStyles.NO_SIGNAL;

  return (
    <main style={{ minHeight: '100vh', padding: '32px 20px 64px', background: '#07111f', color: '#e5edf7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <section style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <div style={{ color: '#8ba3bf', fontSize: 13, letterSpacing: 1.4, textTransform: 'uppercase' }}>TechPulse Intelligence</div>
            <h1 style={{ margin: '8px 0 6px', fontSize: 'clamp(32px, 5vw, 58px)', lineHeight: 1 }}>AI CapEx Risk Monitor</h1>
            <p style={{ margin: 0, color: '#9fb0c5', maxWidth: 760, fontSize: 17 }}>
              Converts hyperscaler spending signals into an evidence-backed decision state—before a headline becomes a trade.
            </p>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 999, background: tone.bg, color: tone.fg, fontWeight: 800, whiteSpace: 'nowrap' }}>
            {state.replace('_', ' ')}
          </div>
        </header>

        {!result.ok && (
          <section style={{ border: '1px solid #7f1d1d', background: '#2a1015', borderRadius: 16, padding: 18, marginBottom: 20 }}>
            <strong>Monitor unavailable:</strong> {result.error}
          </section>
        )}

        {data && (
          <>
            <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, .8fr)', gap: 18, marginBottom: 18 }}>
              <article style={panelStyle}>
                <div style={eyebrowStyle}>Current thesis</div>
                <h2 style={{ margin: '10px 0 14px', fontSize: 28, lineHeight: 1.25 }}>{data.thesis}</h2>
                <div style={{ color: '#9fb0c5', fontSize: 14 }}>
                  This engine deliberately refuses to mark a trade ready until fundamental and price confirmation both exist.
                </div>
              </article>

              <article style={panelStyle}>
                <div style={eyebrowStyle}>Signal balance</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                  <Metric label="Bearish" value={data.bearishScore} />
                  <Metric label="Bullish" value={data.bullishScore} />
                  <Metric label="Net risk" value={data.score} />
                  <Metric label="Trade ready" value={data.tradeReady ? 'YES' : 'NO'} />
                </div>
              </article>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 18 }}>
              <ListPanel title="Confirmation required" items={data.confirmationRequired} />
              <ListPanel title="Invalidation" items={data.invalidation} />
              <ListPanel title="Market exposure" items={[
                `Suppliers: ${data.exposedSuppliers.map((item) => item.ticker).join(', ')}`,
                `Basket proxies: ${data.basketProxies.join(', ')}`,
                `Controllers in evidence: ${data.controllers.length ? data.controllers.map((item) => item.ticker).join(', ') : 'None yet'}`
              ]} />
            </section>

            <section style={panelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', marginBottom: 14 }}>
                <div>
                  <div style={eyebrowStyle}>Evidence</div>
                  <h2 style={{ margin: '6px 0 0', fontSize: 24 }}>What the monitor is using</h2>
                </div>
                <span style={{ color: '#8194aa', fontSize: 13 }}>{data.evidence.length} relevant items</span>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {data.evidence.length ? data.evidence.map((item) => (
                  <article key={item.link} style={{ borderTop: '1px solid #203148', padding: '14px 0 4px' }}>
                    <a href={item.link} target="_blank" rel="noreferrer" style={{ color: '#f4f7fb', textDecoration: 'none', fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>
                      {item.title}
                    </a>
                    <div style={{ marginTop: 8, color: '#8da2b9', fontSize: 13 }}>
                      {item.sourceName} · bearish {item.bearish} · bullish {item.bullish}{item.tags.length ? ` · ${item.tags.join(', ')}` : ''}
                    </div>
                  </article>
                )) : <div style={{ color: '#8da2b9' }}>No CapEx-specific evidence was found in the current feed.</div>}
              </div>
            </section>

            <p style={{ color: '#71869e', fontSize: 12, marginTop: 16 }}>{data.disclaimer}</p>
          </>
        )}
      </section>
    </main>
  );
}

const panelStyle = { background: '#0c1a2b', border: '1px solid #1c3048', borderRadius: 18, padding: 22, boxShadow: '0 18px 50px rgba(0,0,0,.18)' };
const eyebrowStyle = { color: '#73a6da', fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase' };

function Metric({ label, value }) {
  return <div style={{ background: '#091522', border: '1px solid #1a2a3d', borderRadius: 12, padding: 14 }}><div style={{ color: '#7f94aa', fontSize: 12 }}>{label}</div><div style={{ marginTop: 4, fontSize: 22, fontWeight: 800 }}>{String(value)}</div></div>;
}

function ListPanel({ title, items }) {
  return <article style={panelStyle}><div style={eyebrowStyle}>{title}</div><ul style={{ margin: '14px 0 0', paddingLeft: 20, color: '#c7d3e1', lineHeight: 1.55 }}>{items.map((item) => <li key={item} style={{ marginBottom: 9 }}>{item}</li>)}</ul></article>;
}
