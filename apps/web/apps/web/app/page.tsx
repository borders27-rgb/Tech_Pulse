async function fetchItems() {
  const endpoint = process.env.NEXT_PUBLIC_AGGREGATE_URL!;
  const res = await fetch(endpoint, { cache: "no-store" });
  const data = await res.json();
  return data.items as { title: string; link: string; date?: string; source?: string }[];
}

export default async function Page() {
  const items = await fetchItems();
  return (
    <main style={{ maxWidth: 780, margin: "40px auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1>TechPulse</h1>
      <p style={{ opacity: 0.7 }}>Emerging tech headlines (server-side aggregated)</p>
      <ul>
        {items.slice(0, 50).map((item, idx) => (
          <li key={idx} style={{ margin: "10px 0" }}>
            <a href={item.link} target="_blank" rel="noreferrer">{item.title}</a>
            {item.date && <span style={{ marginLeft: 6, opacity: 0.6 }}> · {item.date}</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
