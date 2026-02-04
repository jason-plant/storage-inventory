"use client";

import RequireAuth from "../components/RequireAuth";
import Modal from "../components/Modal";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import EditIconButton from "../components/EditIconButton";
import DeleteIconButton from "../components/DeleteIconButton";

type ProjectRow = {
  id: string;
  name: string;
  locations?: { count: number }[];
};

export default function ProjectsPage() {
  return (
    <RequireAuth>
      <ProjectsInner />
    </RequireAuth>
  );
}

function ProjectsInner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [newName, setNewName] = useState("");
  const [exporting, setExporting] = useState(false);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const editRef = useRef<ProjectRow | null>(null);
  const [editName, setEditName] = useState("");

  // delete modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const projectToDeleteRef = useRef<ProjectRow | null>(null);

  // blocked modal
  const [blockedOpen, setBlockedOpen] = useState(false);
  const blockedInfoRef = useRef<{ name: string; locationCount: number } | null>(null);

  // options modal (long press)
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsProjectRef = useRef<ProjectRow | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  async function load() {
    setLoading(true);
    setError(null);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (authErr || !userId) {
      setError(authErr?.message || "Not logged in.");
      setProjects([]);
      setLoading(false);
      return;
    }

    const res = await supabase
      .from("projects")
      .select("id,name, locations(count)")
      .eq("owner_id", userId)
      .order("name");

    if (res.error) {
      setError(res.error.message);
      setProjects([]);
    } else {
      setProjects((res.data ?? []) as ProjectRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createProject() {
    const trimmed = newName.trim();
    if (!trimmed) return;

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
      .from("projects")
      .insert({ owner_id: userId, name: trimmed })
      .select("id,name")
      .single();

    if (res.error || !res.data) {
      setError(res.error?.message || "Failed to create project.");
      setBusy(false);
      return;
    }

    setProjects((prev) => {
      const next = [...prev, res.data as ProjectRow];
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });

    setNewName("");
    setBusy(false);
  }

  function openEdit(p: ProjectRow) {
    setError(null);
    editRef.current = p;
    setEditName(p.name);
    setEditOpen(true);
  }

  async function saveEdit() {
    const p = editRef.current;
    if (!p) return;

    const trimmed = editName.trim();
    if (!trimmed) {
      setError("Project name is required.");
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
      .from("projects")
      .update({ name: trimmed })
      .eq("owner_id", userId)
      .eq("id", p.id)
      .select("id,name")
      .single();

    if (res.error || !res.data) {
      setError(res.error?.message || "Failed to update project.");
      setBusy(false);
      return;
    }

    setProjects((prev) => {
      const next = prev.map((x) => (x.id === p.id ? { ...x, name: res.data.name } : x));
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });

    setEditOpen(false);
    editRef.current = null;
    setEditName("");
    setBusy(false);
  }

  async function requestDelete(p: ProjectRow) {
    setError(null);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (authErr || !userId) {
      setError(authErr?.message || "Not logged in.");
      return;
    }

    const locRes = await supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("project_id", p.id);

    if (locRes.error) {
      setError(locRes.error.message);
      return;
    }

    const count = locRes.count ?? 0;
    if (count > 0) {
      blockedInfoRef.current = { name: p.name, locationCount: count };
      setBlockedOpen(true);
      return;
    }

    projectToDeleteRef.current = p;
    setConfirmDeleteOpen(true);
  }

  async function confirmDelete() {
    const p = projectToDeleteRef.current;
    if (!p) return;

    setBusy(true);
    setError(null);

    const res = await supabase.from("projects").delete().eq("id", p.id);
    if (res.error) {
      setError(res.error.message);
      setBusy(false);
      return;
    }

    setProjects((prev) => prev.filter((x) => x.id !== p.id));
    setConfirmDeleteOpen(false);
    projectToDeleteRef.current = null;
    setBusy(false);
  }

  function openProject(p: ProjectRow) {
    try {
      localStorage.setItem("activeProjectId", p.id);
      localStorage.setItem("activeProjectName", p.name);
      window.dispatchEvent(new Event("active-project-changed"));
    } catch {}
    router.push("/locations");
  }

  function startLongPress(p: ProjectRow) {
    longPressTriggeredRef.current = false;
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      optionsProjectRef.current = p;
      setOptionsOpen(true);
    }, 550);
  }

  function clearLongPress() {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }

  async function exportLegacySurvey(p: ProjectRow) {
    if (exporting) return;
    setExporting(true);
    setError(null);

    try {
      const locRes = await supabase
        .from("locations")
        .select("id, name")
        .eq("project_id", p.id)
        .order("name");
      if (locRes.error) throw locRes.error;
      const locations = locRes.data ?? [];
      const locationIds = locations.map((l) => l.id);

      const boxesRes = locationIds.length
        ? await supabase
            .from("boxes")
            .select("id, code, name, location_id")
            .in("location_id", locationIds)
            .order("code")
        : { data: [], error: null };
      if (boxesRes.error) throw boxesRes.error;
      const boxes = boxesRes.data ?? [];
      const boxIds = boxes.map((b) => b.id);

      const itemsRes = boxIds.length
        ? await supabase
            .from("items")
            .select("id, name, description, quantity, condition, box_id, photo_url")
            .in("box_id", boxIds)
            .order("name")
        : { data: [], error: null };
      if (itemsRes.error) throw itemsRes.error;
      const ffeItems = itemsRes.data ?? [];

      const unitsRes = await supabase
        .from("item_units")
        .select("id, item_id, legacy_code")
        .eq("project_id", p.id)
        .order("legacy_code");
      if (unitsRes.error) throw unitsRes.error;
      const units = unitsRes.data ?? [];

      const locationById = new Map(locations.map((l) => [l.id, l.name] as const));
      const boxById = new Map(boxes.map((b) => [b.id, b] as const));
      const itemById = new Map(ffeItems.map((i) => [i.id, i] as const));

      const legacyRows = units.length
        ? units.map((u, idx) => {
            const it = itemById.get(u.item_id as string);
            const box = it ? boxById.get((it as any).box_id) : undefined;
            const buildingName = box?.location_id ? locationById.get(box.location_id) || "" : "";
            return {
              "No.": idx + 1,
              "Legacy Code": u.legacy_code || "",
              Building: buildingName,
              "Room Number": box?.code || "",
              "Room Name": box?.name || "",
              Description: it?.name || "",
              Quantity: 1,
              "Item Type": "",
              "DfE Code": "",
              Condition: it?.condition ?? "",
              "Life Expectancy": "",
              "Make/Model": "",
              Length: "",
              Depth: "",
              Height: "",
              "Primary Colour": "",
              "Secondary Colour": "",
              "DfE Standard": "",
              Comments: it?.description || "",
              "Photograph Code": u.legacy_code || "",
              "Carbon Saving (KG)": "",
              Photograph: it?.photo_url || "",
            };
          })
        : ffeItems.map((it, idx) => {
            const box = boxById.get(it.box_id);
            const buildingName = box?.location_id ? locationById.get(box.location_id) || "" : "";
            return {
              "No.": idx + 1,
              "Legacy Code": "",
              Building: buildingName,
              "Room Number": box?.code || "",
              "Room Name": box?.name || "",
              Description: it.name || "",
              Quantity: it.quantity ?? "",
              "Item Type": "",
              "DfE Code": "",
              Condition: it.condition ?? "",
              "Life Expectancy": "",
              "Make/Model": "",
              Length: "",
              Depth: "",
              Height: "",
              "Primary Colour": "",
              "Secondary Colour": "",
              "DfE Standard": "",
              Comments: it.description || "",
              "Photograph Code": "",
              "Carbon Saving (KG)": "",
              Photograph: it.photo_url || "",
            };
          });

      const { utils, writeFile } = await import("xlsx");
      const wb = utils.book_new();
      utils.book_append_sheet(wb, utils.json_to_sheet(legacyRows), "Legacy Survey");

      const safeName = p.name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "Project";
      const dateTag = new Date().toISOString().slice(0, 10);
      writeFile(wb, `${safeName}-legacy-survey-${dateTag}.xlsx`);
    } catch (err: any) {
      setError(err?.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main style={{ paddingBottom: 90 }}>
      <h1 style={{ marginTop: 6, marginBottom: 6 }}>Projects</h1>
      <p style={{ marginTop: 0, opacity: 0.75 }}>Projects group buildings together.</p>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {loading && <p>Loading…</p>}

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: 14,
          boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
          maxWidth: 520,
          display: "grid",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <input
          placeholder="New project name (e.g. Warehouse A)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={busy}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={createProject} disabled={busy || !newName.trim()} className="tap-btn primary">
            {busy ? "Saving..." : "Create project"}
          </button>
        </div>
      </div>

      {!loading && projects.length === 0 && <p>No projects yet.</p>}

      <div style={{ display: "grid", gap: 10 }}>
        {projects.map((p) => {
          const locationCount = p.locations?.[0]?.count ?? 0;
          return (
            <div
              key={p.id}
              onClick={() => {
                if (longPressTriggeredRef.current) {
                  longPressTriggeredRef.current = false;
                  return;
                }
                openProject(p);
              }}
              onPointerDown={() => startLongPress(p)}
              onPointerUp={() => clearLongPress()}
              onPointerLeave={() => clearLongPress()}
              onPointerCancel={() => clearLongPress()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openProject(p);
                }
              }}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: 14,
                boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontWeight: 900 }}>{p.name}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{locationCount} building{locationCount === 1 ? "" : "s"}</div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span onClick={(e) => e.stopPropagation()}>
                  <EditIconButton onClick={() => openEdit(p)} title="Edit project" />
                </span>
                <span onClick={(e) => e.stopPropagation()}>
                  <DeleteIconButton onClick={() => requestDelete(p)} title="Delete project" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Options modal */}
      <Modal open={optionsOpen} title="Project options" onClose={() => setOptionsOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>{optionsProjectRef.current?.name || "Project"}</div>
          {error && <p style={{ color: "crimson", margin: 0 }}>Error: {error}</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="tap-btn" onClick={() => setOptionsOpen(false)} disabled={exporting}>Cancel</button>
            <button
              className="tap-btn primary"
              onClick={() => {
                if (optionsProjectRef.current) exportLegacySurvey(optionsProjectRef.current);
              }}
              disabled={exporting}
            >
              {exporting ? "Exporting…" : "Export legacy survey"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={editOpen} title="Edit project" onClose={() => setEditOpen(false)}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800 }}>Name</span>
          <input value={editName} onChange={(e) => setEditName(e.target.value)} disabled={busy} />
        </label>
        {error && <p style={{ color: "crimson", margin: 0 }}>Error: {error}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="tap-btn" onClick={() => setEditOpen(false)} disabled={busy}>Cancel</button>
          <button className="tap-btn primary" onClick={saveEdit} disabled={busy || !editName.trim()}>
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </Modal>

      {/* Confirm delete */}
      <Modal open={confirmDeleteOpen} title="Delete project?" onClose={() => setConfirmDeleteOpen(false)}>
        <p style={{ marginTop: 0 }}>This cannot be undone.</p>
        {error && <p style={{ color: "crimson", margin: 0 }}>Error: {error}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="tap-btn" onClick={() => setConfirmDeleteOpen(false)} disabled={busy}>Cancel</button>
          <button className="tap-btn danger" onClick={confirmDelete} disabled={busy}>Delete</button>
        </div>
      </Modal>

      {/* Blocked delete */}
      <Modal open={blockedOpen} title="Can’t delete project" onClose={() => setBlockedOpen(false)}>
        <p style={{ marginTop: 0 }}>
          {blockedInfoRef.current?.name} has {blockedInfoRef.current?.locationCount ?? 0} building(s).
          Move or delete those buildings first.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="tap-btn" onClick={() => setBlockedOpen(false)}>OK</button>
        </div>
      </Modal>
    </main>
  );
}
