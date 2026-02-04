"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import RequireAuth from "../../components/RequireAuth";
import Modal from "../../components/Modal";
import { useUnsavedChanges } from "../../components/UnsavedChangesProvider";

type BoxMini = { code: string };

type LocationRow = {
  id: string;
  name: string;
  project_id?: string | null;
};

type ProjectRow = {
  id: string;
  name: string;
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

export default function NewBoxPage() {
  return (
    <RequireAuth>
      <NewBoxInner />
    </RequireAuth>
  );
}

function NewBoxInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialLocationId = searchParams.get("locationId") ?? "";
  const returnTo = searchParams.get("returnTo") ?? "";

  const [existingCodes, setExistingCodes] = useState<string[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectId, setProjectId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ user-visible fields only
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState<string>(initialLocationId);

  const { setDirty } = useUnsavedChanges();
  const [roomNumber, setRoomNumber] = useState("");

  useEffect(() => {
    const dirty = name.trim() !== "" || roomNumber.trim() !== "" || Boolean(locationId);
    setDirty(dirty);
  }, [name, roomNumber, locationId, setDirty]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("activeProjectId") || "";
    setProjectId(stored);
  }, []);

  // Inline "create location" modal
  const [newLocOpen, setNewLocOpen] = useState(false);
  const [newLocName, setNewLocName] = useState("");
  const [newLocBusy, setNewLocBusy] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);

    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    if (sessionErr || !userId) {
      setError(sessionErr?.message || "Not logged in.");
      setExistingCodes([]);
      setLocations([]);
      setLoading(false);
      return;
    }

    // existing codes (per user)
    const codesRes = await supabase
      .from("boxes")
      .select("code")
      .order("code");

    if (codesRes.error) {
      setError(codesRes.error.message);
      setExistingCodes([]);
    } else {
      setExistingCodes((codesRes.data ?? []).map((b: BoxMini) => b.code));
    }

    const ownedRes = await supabase
      .from("projects")
      .select("id,name")
      .eq("owner_id", userId)
      .order("name");

    if (ownedRes.error) {
      setError((prev) => prev ?? (ownedRes.error?.message ?? "Failed to load projects."));
    }

    const memberRes = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);

    if (memberRes.error) {
      setError((prev) => prev ?? (memberRes.error?.message ?? "Failed to load project members."));
    }

    const memberIds = (memberRes.data ?? []).map((m) => m.project_id as string);
    const owned = (ownedRes.data ?? []) as ProjectRow[];
    const allIds = Array.from(new Set([...owned.map((p) => p.id), ...memberIds]));

    if (allIds.length) {
      const allRes = await supabase
        .from("projects")
        .select("id,name")
        .in("id", allIds)
        .order("name");
      if (!allRes.error) setProjects((allRes.data ?? []) as ProjectRow[]);
    } else if (owned.length) {
      setProjects(owned);
    }

    // locations (per user)
    let locQuery = supabase
      .from("locations")
      .select("id, name, project_id");

    if (projectId === "__unassigned__") {
      locQuery = locQuery.is("project_id", null);
    } else if (projectId) {
      locQuery = locQuery.eq("project_id", projectId);
    }

    const locRes = await locQuery.order("name");

    if (locRes.error) {
      setError((prev) => prev ?? locRes.error.message);
      setLocations([]);
    } else {
      const locs = (locRes.data ?? []) as LocationRow[];
      setLocations(locs);

      // if locationId came from querystring but doesn't exist, clear it
      if (locationId && !locs.some((l) => l.id === locationId)) {
        setLocationId("");
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const nextAutoCode = useMemo(() => {
          <input
            placeholder="Room number (e.g. 204)"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            disabled={busy || loading}
          />
    let max = 0;
    for (const c of existingCodes) {
      const n = parseBoxNumber(c);
      if (n !== null && n > max) max = n;
    }
    return `BOX-${pad3(max + 1)}`;
  }, [existingCodes]);

  async function handleLocationChange(value: string) {
    if (value === "__new__") {
      setNewLocName("");
      setNewLocOpen(true);
      return;
    }
    setLocationId(value);
  }

  async function createLocationInline() {
    const trimmed = newLocName.trim();
    if (!trimmed) return;

    if (!projectId || projectId === "__unassigned__") {
      setError("Select a project before creating a building.");
      return;
    }

    setNewLocBusy(true);
    setError(null);

    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    if (sessionErr || !userId) {
      setError(sessionErr?.message || "Not logged in.");
      setNewLocBusy(false);
      return;
    }

    const res = await supabase
      .from("locations")
      .insert({ owner_id: userId, name: trimmed, project_id: projectId })
      .select("id, name")
      .single();

    if (res.error || !res.data) {
      setError(res.error?.message || "Failed to create building.");
      setNewLocBusy(false);
      return;
    }

    setLocations((prev) => {
      const next = [...prev, res.data as LocationRow];
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });

    setLocationId(res.data.id);

    setNewLocOpen(false);
    setNewLocName("");
    setNewLocBusy(false);
  }

  async function tryInsertWithCode(code: string) {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    if (sessionErr || !userId) {
      return { ok: false as const, message: sessionErr?.message || "Not logged in." };
    }

    const insertRes = await supabase
      .from("boxes")
      .insert([
        {
          id: generateId(),
          owner_id: userId,
          code: code.toUpperCase(),
          name: name.trim() || null,
          location_id: locationId || null,
        },
      ])
      .select("code")
      .single();

    if (insertRes.error || !insertRes.data) {
      return { ok: false as const, message: insertRes.error?.message || "Failed to create room." };
    }

    return { ok: true as const, code: insertRes.data.code };
  }

  async function save() {
    setBusy(true);
    setError(null);

    // Try with current nextAutoCode
    let result = await tryInsertWithCode(nextAutoCode);

    // If it collided, reload and try once more
    if (!result.ok) {
      await loadData();
      // compute a fresh next code after reload
      let max = 0;
      for (const c of existingCodes) {
        const n = parseBoxNumber(c);
        if (n !== null && n > max) max = n;
      }
      const retryCode = `BOX-${pad3(max + 1)}`;

      result = await tryInsertWithCode(retryCode);
    }

    if (!result.ok) {
      setError(result.message || "Failed to create box.");
      setBusy(false);
      return;
    }

    // ✅ return to location if provided, otherwise boxes list
    setDirty(false);
    const dest = result.code ? `/box/${encodeURIComponent(result.code)}/new-item` : (returnTo ? decodeURIComponent(returnTo) : "/boxes");
    router.push(dest);
    router.refresh();
  }

  return (
    <main style={{ paddingBottom: 90 }}>
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 14,
          boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
          maxWidth: 560,
        }}
      >
        <h1 className="sr-only" style={{ marginTop: 6 }}>Create Room</h1>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          Enter a name (optional) and pick a building (optional). Code is generated automatically.
        </p>

        {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
        {loading && <p>Loading…</p>}

        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            disabled={busy}
          />

          <input
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="Room number (e.g. 204)"
            disabled={busy}
          />

          <div style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 800 }}>Project</span>
            <div style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }}>
              {projectId && projectId !== "__unassigned__"
                ? (projects.find((p) => p.id === projectId)?.name ?? "Selected project")
                : "No project selected"}
            </div>
            {!projectId && <a href="/projects" className="tap-btn">Select a project</a>}
          </div>

          <select
            value={locationId}
            onChange={(e) => handleLocationChange(e.target.value)}
            disabled={busy || loading}
          >
            <option value="">Select building (optional)</option>
            <option value="__new__">➕ Create new building…</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                if (returnTo) router.push(decodeURIComponent(returnTo));
                else router.push("/boxes");
              }}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={save}
              disabled={busy || loading}
              style={{ background: "#111", color: "#fff" }}
            >
              {busy ? "Saving..." : "Save room"}
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={newLocOpen}
        title="Create new building"
        onClose={() => {
          if (newLocBusy) return;
          setNewLocOpen(false);
          setNewLocName("");
        }}
      >
        <p style={{ marginTop: 0, opacity: 0.85 }}>Add a new building without leaving this page.</p>

        <input
          placeholder="Building name (e.g. Warehouse, Office)"
          value={newLocName}
          onChange={(e) => setNewLocName(e.target.value)}
          autoFocus
          disabled={newLocBusy}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              if (newLocBusy) return;
              setNewLocOpen(false);
              setNewLocName("");
            }}
            disabled={newLocBusy}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={createLocationInline}
            disabled={newLocBusy || !newLocName.trim()}
            style={{ background: "#111", color: "#fff" }}
          >
            {newLocBusy ? "Creating..." : "Create building"}
          </button>
        </div>
      </Modal>
    </main>
  );
}

/* Local modal replaced by shared `Modal` component in `app/components/Modal.tsx` */
