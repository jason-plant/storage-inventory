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
      window.dispatchEvent(new Event("active-project-changed"));
    } catch {}
    router.push("/locations");
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
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontWeight: 900 }}>{p.name}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{locationCount} building{locationCount === 1 ? "" : "s"}</div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="tap-btn" onClick={() => openProject(p)}>Open</button>
                <EditIconButton onClick={() => openEdit(p)} title="Edit project" />
                <DeleteIconButton onClick={() => requestDelete(p)} title="Delete project" />
              </div>
            </div>
          );
        })}
      </div>

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
