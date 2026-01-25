"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type SearchItem = {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  quantity: number | null;
  // this field name depends on your select alias
  box: {
    code: string;
    location: string | null;
  } | null;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // IMPORTANT: state is typed
  const [items, setItems] = useState<SearchItem[]>([]);

  useEffect(() => {
    const q = query.trim();

    if (!q) {
      setItems([]);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      const res = await supabase
        .from("items")
        .select(
          `
          id,
          name,
          description,
          photo_url,
          quantity,
          box:boxes (
            code,
            location
          )
        `
        )
        .ilike("name", `%${q}%`)
        .limit(50);

      if (res.error) {
        setError(res.error.message);
        setItems([]);
      } else {
  const safeData: SearchItem[] = (res.data ?? []) as unknown as SearchItem[];
  setItems(safeData);
}


      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Search Items</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search item name..."
        style={{
          width: "100%",
          padding: 12,
          fontSize: 16,
          borderRadius: 8,
          border: "1px solid #444",
          marginBottom: 16,
        }}
      />

      {loading && <p>Searching…</p>}
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {!loading && query && items.length === 0 && !error && <p>No items found.</p>}

      <ul style={{ paddingLeft: 0, listStyle: "none" }}>
        {items.map((i) => (
          <li
            key={i.id}
            style={{
              border: "1px solid #333",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
              display: "flex",
              gap: 12,
            }}
          >
            {i.photo_url && (
              <img
                src={i.photo_url}
                alt={i.name}
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 6,
                }}
              />
            )}

            <div>
              <strong>{i.name}</strong>
              {i.quantity ? ` (x${i.quantity})` : ""}
              {i.description && <div>{i.description}</div>}

              {i.box && (
                <div style={{ marginTop: 6 }}>
                  Box:{" "}
                  <a
                    href={`/box/${encodeURIComponent(i.box.code)}`}
                    style={{ fontWeight: 600 }}
                  >
                    {i.box.code}
                  </a>
                  {i.box.location ? ` — ${i.box.location}` : ""}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
