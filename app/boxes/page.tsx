"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import RequireAuth from "../components/RequireAuth";
import DeleteIconButton from "../components/DeleteIconButton";
import EditIconButton from "../components/EditIconButton";
import Modal from "../components/Modal"; 

type LocationRow = {
  id: string;
  name: string;
  project_id?: string | null;
};


type BoxRow = {
  id: string;
  code: string;
  name: string | null;
  location_id: string | null;
  location_name?: string | null;
  items?: { quantity: number | null }[]; // for qty sum
};

export default function BoxesPage() {
  return (
    <RequireAuth>
      <BoxesInner />
    </RequireAuth>
  );
}

function BoxesInner() {
  const [boxes, setBoxes] = useState<BoxRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const boxToDeleteRef = useRef<BoxRow | null>(null);

  // Edit box modal
  const [editOpen, setEditOpen] = useState(false);
  const editBoxRef = useRef<BoxRow | null>(null);
  const [editName, setEditName] = useState("");

  // Move mode
  const [moveMode, setMoveMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedRef = useRef<Set<string>>(new Set());
  const [destLocationId, setDestLocationId] = useState<string>("");

  const [hideBoxCode, setHideBoxCode] = useState<boolean>(false);

  // Create location modal (for move flow)
  const [newLocOpen, setNewLocOpen] = useState(false);
  const [newLocName, setNewLocName] = useState("");

  // Confirm move modal
  const [confirmMoveOpen, setConfirmMoveOpen] = useState(false);
  const confirmMoveInfoRef = useRef<{
    count: number;
    toLocationId: string | null;
    toLocationName: string;
    boxIds: string[];
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const readSetting = () => setHideBoxCode(localStorage.getItem("hideBoxCode") === "1");
    readSetting();
    window.addEventListener("storage", readSetting);
    return () => window.removeEventListener("storage", readSetting);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("activeProjectId") || "";
    setProjectId(stored);
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (authErr || !userId) {
      setError(authErr?.message || "Not logged in.");
      setLocations([]);
      setBoxes([]);
      setLoading(false);
      return;
    }

    // Load locations
    let locQuery = supabase.from("locations").select("id,name,project_id");
    if (projectId === "__unassigned__") {
      locQuery = locQuery.is("project_id", null);
    } else if (projectId) {
      locQuery = locQuery.eq("project_id", projectId);
    }
    const locRes = await locQuery.order("name");
    if (locRes.error) {
      setError(locRes.error.message);
      setLocations([]);
    } else {
      setLocations((locRes.data ?? []) as LocationRow[]);
    }

    // Load boxes + item qty + location join
    let boxQuery = supabase
      .from("boxes")
      .select(
        `
        id,
        code,
        name,
        location_id,
        items ( quantity ),
        locations:locations ( name, project_id )
      `
      )
      .order("code", { ascending: true });

    if (projectId === "__unassigned__") {
      boxQuery = boxQuery.is("locations.project_id", null);
    } else if (projectId) {
      boxQuery = boxQuery.eq("locations.project_id", projectId);
    }

    const boxRes = await boxQuery;

    if (boxRes.error) {
      setError(boxRes.error.message);
      setBoxes([]);
    } else {
      const mapped = ((boxRes.data ?? []) as any[]).map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name ?? null,
        location_id: b.location_id ?? null,
        items: b.items ?? [],
        location_name: b.locations?.name ?? null,
      })) as BoxRow[];

      setBoxes(mapped);
    }

    // reset move state
    setMoveMode(false);
    const empty = new Set<string>();
    setSelectedIds(empty);
    selectedRef.current = empty;
    setDestLocationId("");
    setConfirmMoveOpen(false);
    confirmMoveInfoRef.current = null;

    // reset create loc modal
    setNewLocOpen(false);
    setNewLocName("");

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, [projectId]);

  function requestDeleteBox(b: BoxRow) {
    boxToDeleteRef.current = b;
    setConfirmDeleteOpen(true);
  }

  function getStoragePathFromPublicUrl(url: string) {
    const marker = "/item-photos/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length);
  }

  async function confirmDeleteBox() {
    const boxToDelete = boxToDeleteRef.current;
    if (!boxToDelete) return;

    setBusy(true);
    setError(null);

    const itemsRes = await supabase.from("items").select("id, photo_url").eq("box_id", boxToDelete.id);

    if (itemsRes.error) {
      setError(itemsRes.error.message);
      setBusy(false);
      return;
    }

    const items = (itemsRes.data ?? []) as { id: string; photo_url: string | null }[];

    // Best-effort photo delete
    const paths: string[] = [];
    for (const it of items) {
      if (!it.photo_url) continue;
      const path = getStoragePathFromPublicUrl(it.photo_url);
      if (path) paths.push(path);
    }
    if (paths.length) {
      await supabase.storage.from("item-photos").remove(paths);
    }

    // Delete items then box
    const delItemsRes = await supabase.from("items").delete().eq("box_id", boxToDelete.id);
    if (delItemsRes.error) {
      setError(delItemsRes.error.message);
      setBusy(false);
      return;
    }

    const delBoxRes = await supabase.from("boxes").delete().eq("id", boxToDelete.id);
    if (delBoxRes.error) {
      setError(delBoxRes.error.message);
      setBusy(false);
      return;
    }

    setBoxes((prev) => prev.filter((x) => x.id !== boxToDelete.id));
    setConfirmDeleteOpen(false);
    boxToDeleteRef.current = null;
    setBusy(false);
  }

  // ===== Edit Box =====
  function openEditBox(b: BoxRow) {
    setError(null);
    editBoxRef.current = b;
    setEditName(b.name ?? "");
    setEditOpen(true);
  }

  async function saveEdit() {
    const b = editBoxRef.current;
    if (!b) return;

    const trimmed = editName.trim();
    if (!trimmed) {
      setError("Room name is required.");
      return;
    }

    setBusy(true);
    setError(null);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (authErr || !userId) {
      setError(authErr?.message || "Not logged in.");
      setBusy(false);
      return;
    }

    const res = await supabase
      .from("boxes")
      .update({ name: trimmed })
      .eq("id", b.id)
      .select("id,name")
      .single();

    if (res.error || !res.data) {
      setError(res.error?.message || "Failed to update room.");
      setBusy(false);
      return;
    }

    setBoxes((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: res.data.name } : x)));

    setEditOpen(false);
    editBoxRef.current = null;
    setEditName("");
    setBusy(false);
  }

  // ===== Move Mode =====

  function enterMoveMode() {
    setMoveMode(true);
    const empty = new Set<string>();
    setSelectedIds(empty);
    selectedRef.current = empty;
    setDestLocationId("");
    setError(null);
  }

  function exitMoveMode() {
    setMoveMode(false);
    const empty = new Set<string>();
    setSelectedIds(empty);
    selectedRef.current = empty;
    setDestLocationId("");
    setError(null);

    setNewLocOpen(false);
    setNewLocName("");
  }

  function toggleSelected(boxId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(boxId) ? next.delete(boxId) : next.add(boxId);
      selectedRef.current = next;
      return next;
    });
  }

  function selectAll() {
    const all = new Set(boxes.map((b) => b.id));
    setSelectedIds(all);
    selectedRef.current = all;
  }

  function clearSelected() {
    const empty = new Set<string>();
    setSelectedIds(empty);
    selectedRef.current = empty;
  }

  const destName = useMemo(() => {
    if (destLocationId === "__none__") return "No building";
    const l = locations.find((x) => x.id === destLocationId);
    return l?.name ?? "Destination";
  }, [destLocationId, locations]);

  function onDestinationChange(value: string) {
    if (value === "__new_location__") {
      // open modal instead of selecting this value
      setDestLocationId("");
      setNewLocName("");
      setNewLocOpen(true);
      return;
    }
    setDestLocationId(value);
  }

  async function createLocationFromMove() {
    const trimmed = newLocName.trim();
    if (!trimmed) {
      setError("Building name is required.");
      return;
    }

    if (!projectId || projectId === "__unassigned__") {
      setError("Select a project before creating a building.");
      return;
    }

    setBusy(true);
    setError(null);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (authErr || !userId) {
      setError(authErr?.message || "Not logged in.");
      setBusy(false);
      return;
    }

    const res = await supabase
      .from("locations")
      .insert({ owner_id: userId, name: trimmed, project_id: projectId })
      .select("id,name")
      .single();

    if (res.error || !res.data) {
      setError(res.error?.message || "Failed to create building.");
      setBusy(false);
      return;
    }

    setLocations((prev) => {
      const next = [...prev, { id: res.data.id, name: res.data.name }];
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });

    setDestLocationId(res.data.id);
    setNewLocOpen(false);
    setNewLocName("");
    setBusy(false);
  }

  function requestMoveSelected() {
    const ids = Array.from(selectedRef.current);
    if (ids.length === 0) {
      setError("Select at least one room.");
      return;
    }
    if (!destLocationId) {
      setError("Choose a destination building.");
      return;
    }

    confirmMoveInfoRef.current = {
      count: ids.length,
      toLocationId: destLocationId === "__none__" ? null : destLocationId,
      toLocationName: destName,
      boxIds: ids,
    };

    setConfirmMoveOpen(true);
  }

  async function confirmMoveSelected() {
    const info = confirmMoveInfoRef.current;
    if (!info) return;

    setBusy(true);
    setError(null);

    const res = await supabase.from("boxes").update({ location_id: info.toLocationId }).in("id", info.boxIds);

    if (res.error) {
      setError(res.error.message);
      setBusy(false);
      return;
    }

    await loadAll();

    setConfirmMoveOpen(false);
    confirmMoveInfoRef.current = null;
    setBusy(false);
  }

  return (
    <main style={{ paddingBottom: moveMode ? 180 : 90 }}>
      <h1 className="sr-only" style={{ marginTop: 6 }}>Rooms</h1>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {loading && <p>Loading rooms…</p>}
      {!loading && boxes.length === 0 && <p>No rooms yet.</p>}

      {/* Move Mode helper panel */}
      {moveMode && (
        <div
          style={{
            background: "#fff",
            border: "2px solid #111",
            borderRadius: 18,
            padding: 14,
            boxShadow: "0 1px 10px rgba(0,0,0,0.10)",
            marginBottom: 12,
            marginTop: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0 }}>Move rooms</h2>
              <div style={{ opacity: 0.85 }}>Tap room cards to select. Use the sticky bar to move.</div>
            </div>

            <button type="button" onClick={exitMoveMode} disabled={busy}>
              Done
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" onClick={selectAll} disabled={busy || boxes.length === 0}>
              Select all
            </button>
            <button type="button" onClick={clearSelected} disabled={busy || selectedIds.size === 0}>
              Clear
            </button>
            <div style={{ alignSelf: "center", opacity: 0.85 }}>
              Selected: <strong>{selectedIds.size}</strong>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {boxes.map((b) => {
          const totalQty = b.items?.reduce((sum, it) => sum + (it.quantity ?? 0), 0) ?? 0;
          const isSelected = selectedIds.has(b.id);

          return (
            <a
              key={b.id}
              href={moveMode ? "#" : `/box/${encodeURIComponent(b.code)}`}
              onClick={(e) => {
                if (!moveMode) return;
                e.preventDefault();
                toggleSelected(b.id);
              }}
              style={{
                background: "#fff",
                border: moveMode ? (isSelected ? "2px solid #16a34a" : "2px solid #e5e7eb") : "1px solid #e5e7eb",
                borderRadius: 18,
                padding: 14,
                boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                textDecoration: "none",
                color: "#111",
                cursor: moveMode ? "pointer" : "default",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                {!hideBoxCode && <div style={{ fontWeight: 900, fontSize: 16 }}>{b.code}</div>}

                {b.name && <div style={{ fontWeight: 700 }}>{b.name}</div>}
                <div style={{ opacity: 0.8 }}>{b.location_name ? b.location_name : "No building"}</div>

                <div
                  style={{
                    marginTop: 6,
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontWeight: 900,
                    fontSize: 13,
                    background: "#ecfdf5",
                    border: "1px solid #bbf7d0",
                    color: "#166534",
                    width: "fit-content",
                  }}
                >
                  {totalQty} item{totalQty === 1 ? "" : "s"}
                </div>
              </div>

              {/* ✅ Edit + Delete icons (prevent card navigation click) */}
              {!moveMode && (
                <div style={{ display: "flex", gap: 8 }}>
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <EditIconButton title="Edit room" disabled={busy} onClick={() => openEditBox(b)} />
                  </span>

                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <DeleteIconButton title="Delete room" disabled={busy} onClick={() => requestDeleteBox(b)} />
                  </span>
                </div>
              )}
            </a>
          );
        })}
      </div>

      {/* FAB: Create new box */}
      <a
        href="/boxes/new"
        aria-label="Create new room"
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          width: 58,
          height: 58,
          borderRadius: 999,
          background: "#111",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          boxShadow: "0 14px 30px rgba(0,0,0,0.25)",
          zIndex: 2000,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </a>

      {/* Move Rooms FAB */}
      <button
        type="button"
        onClick={() => (moveMode ? exitMoveMode() : enterMoveMode())}
        aria-label="Move rooms"
        style={{
          position: "fixed",
          right: 18,
          bottom: 86,
          width: 58,
          height: 58,
          borderRadius: 999,
          background: moveMode ? "#16a34a" : "#ffffff",
          border: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 14px 30px rgba(0,0,0,0.20)",
          zIndex: 2000,
          cursor: "pointer",
        }}
        title={moveMode ? "Exit move mode" : "Move rooms"}
        disabled={busy}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={moveMode ? "white" : "#111"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6.5" width="7" height="7" rx="1.5" />
          <rect x="14" y="10.5" width="7" height="7" rx="1.5" />
          <path d="M7 5.5c2.5-2 6.5-2 9 0" />
          <path d="M16 5.5h-3" />
          <path d="M17 5.5v3" />
          <path d="M17 18.5c-2.5 2-6.5 2-9 0" />
          <path d="M7 18.5h3" />
          <path d="M7 18.5v-3" />
        </svg>
      </button>

      {/* Sticky Move Bar */}
      {moveMode && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "12px 14px calc(env(safe-area-inset-bottom) + 12px)",
            background: "#ffffff",
            borderTop: "1px solid #e5e7eb",
            boxShadow: "0 -10px 30px rgba(0,0,0,0.15)",
            zIndex: 3500,
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 900 }}>Selected: {selectedIds.size}</div>

          <div style={{ flex: 1, minWidth: 190 }}>
            <select value={destLocationId} onChange={(e) => onDestinationChange(e.target.value)} disabled={busy} style={{ width: "100%" }}>
              <option value="">Destination location…</option>
              <option value="__none__">No location</option>
              <option value="__new_location__">➕ Create new building…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={requestMoveSelected}
            disabled={busy || selectedIds.size === 0 || !destLocationId}
            style={{
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              padding: "10px 16px",
              borderRadius: 14,
            }}
          >
            Move
          </button>
        </div>
      )}

      {/* Create Location Modal (from move) */}
      <Modal
        open={newLocOpen}
        title="Create new building"
        onClose={() => {
          if (busy) return;
          setNewLocOpen(false);
          setNewLocName("");
        }}
      >
        <p style={{ marginTop: 0, opacity: 0.85 }}>Type a name, create it, and it’ll be selected as the destination.</p>

        <input placeholder="Building name (e.g. Warehouse, Office)" value={newLocName} onChange={(e) => setNewLocName(e.target.value)} autoFocus />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              if (busy) return;
              setNewLocOpen(false);
              setNewLocName("");
            }}
            disabled={busy}
          >
            Cancel
          </button>

          <button type="button" onClick={createLocationFromMove} disabled={busy || !newLocName.trim()} style={{ background: "#111", color: "#fff" }}>
            {busy ? "Creating..." : "Create building"}
          </button>
        </div>
      </Modal>

      {/* Confirm Move Modal */}
      <Modal
        open={confirmMoveOpen}
        title="Confirm move"
        onClose={() => {
          if (busy) return;
          setConfirmMoveOpen(false);
          confirmMoveInfoRef.current = null;
        }}
      >
        {(() => {
          const info = confirmMoveInfoRef.current;
          if (!info) return <p>Missing move info.</p>;

          return (
            <>
              <p style={{ marginTop: 0 }}>
                Move <strong>{info.count}</strong> box(es) to <strong>{info.toLocationName}</strong>?
              </p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (busy) return;
                    setConfirmMoveOpen(false);
                    confirmMoveInfoRef.current = null;
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>

                <button type="button" onClick={confirmMoveSelected} disabled={busy} style={{ background: "#111", color: "#fff" }}>
                  {busy ? "Moving..." : "Yes, move"}
                </button>
              </div>
            </>
          );
        })()}
      </Modal>

      {/* Edit box modal */}
      <Modal
        open={editOpen}
        title={`Rename box ${editBoxRef.current?.code ?? ""}`}
        onClose={() => {
          if (busy) return;
          setEditOpen(false);
          editBoxRef.current = null;
          setEditName("");
        }}
      >
        <p style={{ marginTop: 0, opacity: 0.85 }}>Change the box name. This does not move the box.</p>

        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Room name" autoFocus />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              if (busy) return;
              setEditOpen(false);
              editBoxRef.current = null;
              setEditName("");
            }}
            disabled={busy}
          >
            Cancel
          </button>

          <button type="button" onClick={saveEdit} disabled={busy || !editName.trim()} style={{ background: "#111", color: "#fff" }}>
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </Modal>

      {/* Delete box modal */}
      <Modal
        open={confirmDeleteOpen}
        title="Delete room?"
        onClose={() => {
          if (busy) return;
          setConfirmDeleteOpen(false);
          boxToDeleteRef.current = null;
        }}
      >
        <p style={{ marginTop: 0 }}>
          Delete <strong>{boxToDeleteRef.current?.code ?? "this room"}</strong>?
        </p>
        <p style={{ marginTop: 0, opacity: 0.85 }}>This will delete all items inside it and remove linked photos.</p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => {
              if (busy) return;
              setConfirmDeleteOpen(false);
              boxToDeleteRef.current = null;
            }}
            disabled={busy}
          >
            Cancel
          </button>

          <DeleteIconButton title="Confirm delete" disabled={busy} variant="solid" onClick={confirmDeleteBox} />
          {busy && <span style={{ opacity: 0.75 }}>Deleting…</span>}
        </div>
      </Modal>
    </main>
  );
}

/* Local modal replaced by shared `Modal` component in `app/components/Modal.tsx` */