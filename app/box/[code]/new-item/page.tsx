"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

export default function NewItemPage() {
  const params = useParams<{ code?: string }>();
  const code = params?.code ? decodeURIComponent(String(params.code)) : "";
  const router = useRouter();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setError("Item name is required.");
      return;
    }

    setBusy(true);
    setError(null);

    // Find the box id from the code in the URL
    const boxRes = await supabase
      .from("boxes")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (!boxRes.data || boxRes.error) {
      setError("Box not found.");
      setBusy(false);
      return;
    }

    const insertRes = await supabase.from("items").insert({
      box_id: boxRes.data.id,
      name: name.trim(),
      description: desc.trim() || null,
      quantity: qty,
    });

    if (insertRes.error) {
      setError(insertRes.error.message);
      setBusy(false);
      return;
    }

    router.push(`/box/${encodeURIComponent(code)}`);
  }

  return (
    <main>
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 14,
          boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
        }}
      >
        <h1 style={{ marginTop: 6 }}>Add Item</h1>
        <p style={{ opacity: 0.85, marginTop: 0 }}>
          Adding to <strong>{code}</strong>
        </p>

        {error && <p style={{ color: "crimson" }}>{error}</p>}

        <div style={{ display: "grid", gap: 10 }}>
          <input
            placeholder="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <input
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => router.push(`/box/${encodeURIComponent(code)}`)}>
              Cancel
            </button>

            <button
              onClick={save}
              disabled={busy}
              style={{ background: "#111", color: "#fff" }}
            >
              {busy ? "Saving..." : "Save item"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
