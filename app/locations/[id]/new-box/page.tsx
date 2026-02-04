"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type LocationRow = {
  id: string;
  name: string;
};

type BoxMini = {
  id: string;
  code: string;
};

function pad3(n: number) {
  return String(n).padStart(3, "0");
}
function parseBoxNumber(code: string): number | null {
  const m = /^BOX-(\d{3})$/i.exec(code.trim());
  if (!m) return null;
  const num = Number(m[1]);
  return Number.isFinite(num) ? num : null;
}

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function NewBoxInLocationPage() {
  const params = useParams<{ id?: string }>();
  const locationId = params?.id ? decodeURIComponent(String(params.id)) : "";
  const router = useRouter();

  const [location, setLocation] = useState<LocationRow | null>(null);
  const [allBoxes, setAllBoxes] = useState<BoxMini[]>([]);
  const [name, setName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId) return;

    async function load() {
      setErr(null);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (authErr || !userId) {
        setErr(authErr?.message || "Not logged in.");
        return;
      }

      const locRes = await supabase
        .from("locations")
        .select("id, name")
        .eq("id", locationId)
        .maybeSingle();

      if (!locRes.data || locRes.error) {
        setErr("Building not found");
        return;
      }

      setLocation(locRes.data as LocationRow);

      const boxesRes = await supabase
        .from("boxes")
        .select("id, code")
        .order("code");

      setAllBoxes((boxesRes.data ?? []) as BoxMini[]);
    }

    load();
  }, [locationId]);

  const nextAutoCode = useMemo(() => {
    let max = 0;
    for (const b of allBoxes) {
      const n = parseBoxNumber(b.code);
      if (n !== null && n > max) max = n;
    }
    return `BOX-${pad3(max + 1)}`;
  }, [allBoxes]);

  async function createBox() {
    if (!location) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Room name is required.");
      return;
    }

    setBusy(true);
    setErr(null);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (authErr || !userId) {
      setErr(authErr?.message || "Not logged in.");
      setBusy(false);
      return;
    }

    const insertRes = await supabase
      .from("boxes")
      .insert({
        id: generateId(),
        owner_id: userId,
        code: nextAutoCode, // hidden from user
        name: trimmed,
        room_number: roomNumber.trim() || null,
        location_id: location.id,
      })
      .select("code")
      .single();

    if (insertRes.error || !insertRes.data) {
      setErr(insertRes.error?.message || "Failed to create room.");
      setBusy(false);
      return;
    }

    router.push(`/box/${encodeURIComponent(insertRes.data.code)}`);
    router.refresh();
  }

  if (err && !location) {
    return (
      <main style={{ padding: 16 }}>
        <p style={{ color: "crimson" }}>{err}</p>
      </main>
    );
  }

  return (
    <main style={{ paddingBottom: 90 }}>
      <h1 className="sr-only" style={{ margin: "6px 0 6px" }}>Add Room</h1>
      <p style={{ marginTop: 0, opacity: 0.75 }}>
        Building: <strong>{location?.name ?? "…"}</strong>
      </p>

      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 14,
          boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
          maxWidth: 520,
          display: "grid",
          gap: 10,
        }}
      >
        <input
          placeholder="Room name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          disabled={busy}
        />

        <input
          placeholder="Room number (e.g. 204)"
          value={roomNumber}
          onChange={(e) => setRoomNumber(e.target.value)}
          disabled={busy}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => router.back()} disabled={busy}>
            Cancel
          </button>

          <button
            type="button"
            onClick={createBox}
            disabled={busy || !name.trim() || !location}
            style={{ background: "#111", color: "#fff" }}
          >
            {busy ? "Saving..." : "Save room"}
          </button>
        </div>
      </div>
    </main>
  );
}
