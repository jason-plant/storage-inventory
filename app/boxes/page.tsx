"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type BoxRow = {
  id: string;
  code: string;
  name: string | null;
  location: string | null;
};

export default function BoxesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<BoxRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("boxes")
        .select("id, code, name, location")
        .order("code", { ascending: true });

      if (error) {
        setError(error.message);
        setBoxes([]);
      } else {
        setBoxes(data ?? []);
      }

      setLoading(false);
    }

    load();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Boxes</h1>

      {loading && <p>Loading…</p>}

      {error && (
        <p style={{ color: "crimson" }}>
          Error: {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <p>Total boxes: <strong>{boxes.length}</strong></p>

          <div style={{ marginTop: 16 }}>
            {boxes.map((b) => (
              <div
                key={b.id}
                style={{
                  border: "1px solid #333",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <a
  href={`/box/${encodeURIComponent(b.code)}`}
  style={{ fontSize: 18, fontWeight: 700, textDecoration: "none" }}
>
  {b.code}
</a>

                {b.name && <div>{b.name}</div>}
                {b.location && (
                  <div style={{ opacity: 0.8, marginTop: 4 }}>
                    Location: {b.location}
                  </div>
                )}
              </div>
            ))}

            {boxes.length === 0 && (
              <p>No boxes yet. Add one in Supabase to test.</p>
            )}
          </div>
        </>
      )}
    </main>
  );
}
