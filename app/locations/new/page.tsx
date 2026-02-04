"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import RequireAuth from "../../components/RequireAuth";

type ProjectRow = {
  id: string;
  name: string;
};

export default function NewLocationPage() {
  return (
    <RequireAuth>
      <NewLocationInner />
    </RequireAuth>
  );
}

function NewLocationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("projectId") ?? "";

  const [name, setName] = useState("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectId, setProjectId] = useState<string>(initialProjectId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("activeProjectId") || "";
    if (!initialProjectId && stored) setProjectId(stored);
  }, [initialProjectId]);

  useEffect(() => {
    async function loadProjects() {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (authErr || !userId) return;

      const res = await supabase
        .from("projects")
        .select("id,name")
        .eq("owner_id", userId)
        .order("name");

      if (!res.error) setProjects((res.data ?? []) as ProjectRow[]);
    }

    loadProjects();
  }, []);

  async function save() {
    if (!name.trim()) {
      setError("Building name is required.");
      return;
    }

    if (!projectId) {
      setError("Project is required.");
      return;
    }

    setBusy(true);
    setError(null);

    // Get current logged-in user
    const { data: sessionData, error: sessionErr } =
      await supabase.auth.getSession();

    const userId = sessionData.session?.user?.id;

    if (sessionErr || !userId) {
      setError(sessionErr?.message || "Not logged in.");
      setBusy(false);
      return;
    }

    // Insert location with per-user isolation
    const res = await supabase
      .from("locations")
      .insert({
        owner_id: userId,
        name: name.trim(),
        project_id: projectId,
      })
      .select("id")
      .single();

    if (res.error || !res.data) {
      setError(res.error?.message || "Failed to create building.");
      setBusy(false);
      return;
    }

    try {
      localStorage.setItem("activeProjectId", projectId);
      window.dispatchEvent(new Event("active-project-changed"));
    } catch {}

    router.push("/locations");
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
          maxWidth: 520,
        }}
      >
        <h1 className="sr-only" style={{ marginTop: 6 }}>New Building</h1>

        {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 800 }}>Project</span>
            <select
              value={projectId}
              onChange={(e) => {
                const value = e.target.value;
                setProjectId(value);
                try {
                  localStorage.setItem("activeProjectId", value);
                  window.dispatchEvent(new Event("active-project-changed"));
                } catch {}
              }}
              disabled={busy}
            >
              <option value="">Select project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <input
            placeholder="Building name (e.g. Warehouse, Office)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            disabled={busy}
          />

          {projects.length === 0 && (
            <a href="/projects" className="tap-btn">Create a project first</a>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => router.push("/locations")}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={save}
              disabled={busy || !name.trim() || !projectId}
              style={{ background: "#111", color: "#fff" }}
            >
              {busy ? "Saving..." : "Save building"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
