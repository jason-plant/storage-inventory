"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "../../lib/supabaseClient";

type BoxRow = {
  id: string;
  code: string;
  name: string | null;
  location: string | null;
};

export default function LabelsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<BoxRow[]>([]);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  const origin = useMemo(() => {
    // On Vercel this becomes https://your-app.vercel.app
    return typeof window !== "undefined" ? window.location.origin : "";
  }, []);

  useEffect(() => {
    async function loadBoxes() {
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

    loadBoxes();
  }, []);

  useEffect(() => {
    async function makeQrs() {
      if (!origin) return;
      if (boxes.length === 0) return;

      const next: Record<string, string> = {};

      for (const b of boxes) {
        const url = `${origin}/box/${encodeURIComponent(b.code)}`;
        // Smaller size prints better on label sheets
        const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });
        next[b.code] = dataUrl;
      }

      setQrMap(next);
    }

    makeQrs();
  }, [boxes, origin]);

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div className="no-print" style={{ marginBottom: 16 }}>
        <h1>QR Labels</h1>
        <p>
          Print this page (Ctrl+P). Each label opens the box page when scanned.
        </p>
        <p style={{ opacity: 0.8 }}>
          Tip: In print settings, turn on “Background graphics” for cleaner QR
          edges (optional).
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #444",
            cursor: "pointer",
          }}
        >
          Print
        </button>
        <hr style={{ marginTop: 16 }} />
      </div>

      {loading && <p>Loading boxes…</p>}
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {!loading && !error && boxes.length === 0 && (
        <p>No boxes found.</p>
      )}

      {/* Print-friendly grid */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 18,
        }}
      >
        {boxes.map((b) => (
          <div
            key={b.id}
            style={{
              border: "1px solid #000",
              padding: 14,
              borderRadius: 8,
              breakInside: "avoid",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800 }}>{b.code}</div>
            {b.name && <div style={{ fontSize: 12 }}>{b.name}</div>}
            {b.location && (
              <div style={{ fontSize: 11, opacity: 0.8 }}>{b.location}</div>
            )}

            <div style={{ marginTop: 8 }}>
              {qrMap[b.code] ? (
                <img
                  src={qrMap[b.code]}
                  alt={`QR for ${b.code}`}
                  style={{ width: "100%", maxWidth: 240 }}
                />
              ) : (
                <div style={{ fontSize: 12, opacity: 0.7 }}>Generating QR…</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
