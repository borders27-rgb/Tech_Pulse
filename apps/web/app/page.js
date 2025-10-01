'use client';

import { useEffect, useState } from 'react';

export default function Page() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function getData() {
      const endpoint = process.env.NEXT_PUBLIC_AGGREGATE_URL;
      if (!endpoint) return;
      try {
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
    <main style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>TechPulse Dashboard</h1>
      <ul>
        {items.map((item, index) => (
          <li key={index} style={{ margin: '8px 0' }}>
            <a href={item.link} target="_blank" rel="noopener noreferrer">{item.title}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
