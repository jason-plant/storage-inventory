"use client";

import { useEffect, useState } from "react";
import EditIconButton from "../components/EditIconButton";
import EditItemModal from "./EditItemModal";
import { DeleteItemButton } from "./DeleteItemButton";
import { supabase } from "../lib/supabaseClient";
import { DEFAULT_MAX_UPLOAD_BYTES, DEFAULT_MAX_UPLOAD_MB } from "../../lib/image";
import RequireAuth from "../components/RequireAuth";

type SearchItem = {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  quantity: number | null;

  box: {
    code: string;
    name: string | null;
    location: { name: string } | null; // joined from locations table
  } | null;
};

export default function SearchPage() {

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [projectId, setProjectId] = useState<string>("");

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<SearchItem | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const readProject = () => setProjectId(localStorage.getItem("activeProjectId") || "");
    readProject();
    window.addEventListener("storage", readProject);
    window.addEventListener("active-project-changed", readProject as EventListener);
    return () => {
      window.removeEventListener("storage", readProject);
      window.removeEventListener("active-project-changed", readProject as EventListener);
    };
  }, []);

  useEffect(() => {
    const q = query.trim();

    if (!q) {
      setItems([]);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (authErr || !userId) {
        setError(authErr?.message || "Not logged in.");
        setItems([]);
        setLoading(false);
        return;
      }

      const like = `%${q}%`;
      const activeProjectId = projectId && projectId !== "__unassigned__" ? projectId : "";
      const itemSelect = `
        id,
        name,
        description,
        photo_url,
        quantity,
        box:boxes (
          code,
          name,
          location:locations ( name )
        )
      `;

      // 1) Find matching locations (scoped to project when active)
      let locQuery = supabase
        .from("locations")
        .select("id")
        .ilike("name", like);

      if (activeProjectId) {
        locQuery = locQuery.eq("project_id", activeProjectId);
      }

      const locRes = await locQuery;

      // 2) Find boxes in active project (if any)
      let projectLocationIds: string[] = [];
      let projectBoxIds: string[] = [];
      let projectLocRes: { data: any[] | null; error: any } = { data: null, error: null };
      let projectBoxesRes: { data: any[] | null; error: any } = { data: null, error: null };

      if (activeProjectId) {
        projectLocRes = await supabase
          .from("locations")
          .select("id")
          .eq("project_id", activeProjectId);

        projectLocationIds = (projectLocRes.data ?? []).map((l) => l.id);

        if (projectLocationIds.length) {
          projectBoxesRes = await supabase
            .from("boxes")
            .select("id")
            .in("location_id", projectLocationIds);

          projectBoxIds = (projectBoxesRes.data ?? []).map((b) => b.id);
        } else {
          projectBoxesRes = { data: [], error: null };
        }
      }

      // 3) Find boxes that match box code/name OR belong to a matching location
      let boxesByTextRes: { data: any[] | null; error: any } = { data: [], error: null };
      if (!activeProjectId || projectLocationIds.length) {
        let boxQuery = supabase
          .from("boxes")
          .select("id")
          .or(`code.ilike.${like},name.ilike.${like}`);

        if (activeProjectId) boxQuery = boxQuery.in("location_id", projectLocationIds);

        boxesByTextRes = await boxQuery;
      }

      const locationIds = (locRes.data ?? []).map((l) => l.id);
      const boxesByLocationRes = locationIds.length
        ? await supabase
            .from("boxes")
            .select("id")
            .in("location_id", locationIds)
        : { data: [], error: null };

      const boxIds = new Set<string>();
      for (const b of boxesByTextRes.data ?? []) boxIds.add(b.id);
      for (const b of boxesByLocationRes.data ?? []) boxIds.add(b.id);

      // 4) Find items by item name/description
      let itemsByTextRes: { data: any[] | null; error: any } = { data: [], error: null };
      if (!activeProjectId || projectBoxIds.length) {
        let itemsQuery = supabase
          .from("items")
          .select(itemSelect)
          .or(`name.ilike.${like},description.ilike.${like}`);

        if (activeProjectId) itemsQuery = itemsQuery.in("box_id", projectBoxIds);

        itemsByTextRes = await itemsQuery;
      }

      // 5) Find items that live in matched boxes
      const boxIdList = Array.from(boxIds);
      const scopedBoxIdList = activeProjectId && projectBoxIds.length
        ? boxIdList.filter((id) => projectBoxIds.includes(id))
        : boxIdList;

      const itemsByBoxRes = scopedBoxIdList.length
        ? await supabase
            .from("items")
            .select(itemSelect)
            .in("box_id", scopedBoxIdList)
        : { data: [], error: null };

      const firstError =
        locRes.error ||
        projectLocRes.error ||
        projectBoxesRes.error ||
        boxesByTextRes.error ||
        boxesByLocationRes.error ||
        itemsByTextRes.error ||
        itemsByBoxRes.error;

      const normalizeItem = (item: any): SearchItem => {
        const boxValue = Array.isArray(item?.box) ? item.box[0] ?? null : item?.box ?? null;
        return { ...item, box: boxValue } as SearchItem;
      };

      if (firstError) {
        setError(firstError.message);
        setItems([]);
      } else {
        const merged = new Map<string, SearchItem>();
        for (const item of (itemsByTextRes.data ?? [])) merged.set(item.id, normalizeItem(item));
        for (const item of (itemsByBoxRes.data ?? [])) merged.set(item.id, normalizeItem(item));

        const results = Array.from(merged.values()).sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );

        setItems(results);
      }

      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, projectId]);

  return (
    <RequireAuth>
      <main style={{ paddingBottom: 90 }}>
        <h1 className="sr-only" style={{ marginTop: 6 }}>Search</h1>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
              placeholder="Search FFE, descriptions, rooms, or buildings..."
          style={{ width: "100%", marginTop: 10 }}
        />

        {loading && <p>Searching…</p>}
        {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

            {!loading && query && items.length === 0 && !error && <p>No FFE found.</p>}

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {items.map((i) => {
            const boxCode = i.box?.code ?? "";
            const boxName = i.box?.name ?? null;
            const locationName = i.box?.location?.name ?? null;

            // Handler to remove item from list after delete
            function handleDeleted() {
              setItems((prev) => prev.filter((item) => item.id !== i.id));
            }

            return (
              <div
                key={i.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 18,
                  padding: 14,
                  boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                {i.photo_url && (
                  <a href={i.photo_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={i.photo_url}
                      alt={i.name}
                      style={{
                        width: 84,
                        height: 84,
                        objectFit: "cover",
                        borderRadius: 14,
                        border: "1px solid #e5e7eb",
                        flex: "0 0 auto",
                        cursor: "pointer",
                      }}
                    />
                  </a>
                )}

                <div style={{ flex: 1, position: "relative" }}>
                  {/* Location */}
                  {locationName && (
                    <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 2, opacity: 0.88 }}>
                      {locationName}
                    </div>
                  )}
                  {/* Item name */}
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {i.name}
                    {typeof i.quantity === "number" ? ` (x${i.quantity})` : ""}
                  </div>
                  {/* Description */}
                  {i.description && <div style={{ marginTop: 6, opacity: 0.9 }}>{i.description}</div>}
                  {/* Box number, edit, and delete buttons */}
                  <div style={{ marginTop: 10, opacity: 0.9, display: "flex", alignItems: "center", gap: 8 }}>
                    {boxCode && (
                      <a
                        href={`/box/${encodeURIComponent(boxCode)}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "8px 10px",
                          borderRadius: 14,
                          border: "1px solid #ddd",
                          background: "#fff",
                          fontWeight: 900,
                          textDecoration: "none",
                          color: "#111",
                        }}
                      >
                        {boxCode}
                      </a>
                    )}
                    <EditIconButton
                      onClick={() => {
                        setEditItem(i);
                        setEditModalOpen(true);
                      }}
                      title="Edit FFE"
                    />
                          <EditItemModal
                            open={editModalOpen}
                            item={editItem}
                            onClose={() => setEditModalOpen(false)}
                            onSave={async (updated) => {
                              setLoading(true);
                              setError(null);
                              let photo_url = updated.photo_url;
                              const userId = (await supabase.auth.getUser()).data.user?.id;
                              // Remove old photo if new one is uploaded and there was an old photo
                              if (updated.photoFile && updated.photo_url) {
                                const oldUrl = updated.photo_url;
                                const marker = "/item-photos/";
                                const idx = oldUrl.indexOf(marker);
                                if (idx !== -1) {
                                  const oldPath = oldUrl.substring(idx + marker.length);
                                  await supabase.storage.from("item-photos").remove([oldPath]);
                                }
                              }
                              // Upload new photo if present
                              if (updated.photoFile && userId) {
                                let fileToUpload = updated.photoFile;

                                try {
                                  const { compressImageToTarget } = await import("../../lib/image");
                                  const compressed = await compressImageToTarget(updated.photoFile, {
                                    maxSize: 1280,
                                    quality: 0.8,
                                    targetBytes: DEFAULT_MAX_UPLOAD_BYTES,
                                  });

                                  if (compressed.size < updated.photoFile.size) fileToUpload = compressed;
                                } catch {
                                  // If compression fails, fall back to the original file
                                }

                                if (fileToUpload.size > DEFAULT_MAX_UPLOAD_BYTES) {
                                  setError(`Photo is too large. Max ${DEFAULT_MAX_UPLOAD_MB} MB.`);
                                  setLoading(false);
                                  return;
                                }

                                const safeName = fileToUpload.name.replace(/[^\w.\-]+/g, "_");
                                const path = `${userId}/${updated.id}/${Date.now()}-${safeName}`;
                                const uploadRes = await supabase.storage.from("item-photos").upload(path, fileToUpload, {
                                  cacheControl: "3600",
                                  upsert: false,
                                  contentType: fileToUpload.type || "image/jpeg",
                                });
                                if (!uploadRes.error) {
                                  const pub = supabase.storage.from("item-photos").getPublicUrl(path);
                                  photo_url = pub.data.publicUrl;
                                }
                              }
                              // Update item in DB
                              const { error: updateErr } = await supabase
                                .from("items")
                                .update({
                                  name: updated.name,
                                  description: updated.description,
                                  quantity: updated.quantity,
                                  photo_url,
                                })
                                .eq("id", updated.id);
                              if (updateErr) setError(updateErr.message);
                              setItems((prev) => prev.map((it) => it.id === updated.id ? { ...it, ...updated, photo_url } : it));
                              setEditModalOpen(false);
                              setLoading(false);
                            }}
                          />
                    <DeleteItemButton itemId={i.id} onDeleted={handleDeleted} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </RequireAuth>
  );
}
