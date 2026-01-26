"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import RequireAuth from "../../components/RequireAuth";

export default function NewLocationPage() {
  return (
    <RequireAuth>
      <NewLocationInner />
    </RequireAuth>
  );
}

function NewLocationInner() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setError("Location name is required.");
      return;
    }

    setBusy(true);
    setError(null);

    const res = await supabase
      .from("locations")
      .insert({ name: name.trim() })
      .select("id")
      .single();

    if (res.error || !res.data) {
      setError(res.error?.message || "Failed to create location.");
      setBusy(false);
      return;
    }

    // back to locations list
    router.push("/locations");
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
        <h1 style={{ marginTop: 6 }}>New Location</h1>
        {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

        <div style={{ display: "grid", gap: 12 }}>
          <input
            placeholder="Location name (e.g. Shed, Loft, Garage)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => router.push("/locations")} disabled={busy}>
              Cancel
            </button>

            <button
              type="button"
              onClick={save}
              disabled={busy || !name.trim()}
              style={{ background: "#111", color: "#fff" }}
            >
              {busy ? "Saving..." : "Save location"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
