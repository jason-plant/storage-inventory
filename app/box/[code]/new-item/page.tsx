"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { DEFAULT_MAX_UPLOAD_BYTES, DEFAULT_MAX_UPLOAD_MB } from "../../../../lib/image";
import RequireAuth from "../../../components/RequireAuth";
import { useUnsavedChanges } from "../../../components/UnsavedChangesProvider";

export default function NewItemPage() {
  const params = useParams<{ code?: string }>();
  const code = params?.code ? decodeURIComponent(String(params.code)) : "";
  const router = useRouter();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState(1);
  const [condition, setCondition] = useState(3);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [boxName, setBoxName] = useState("");

  const { setDirty } = useUnsavedChanges();

  useEffect(() => {
    const dirty = name.trim() !== "" || desc.trim() !== "" || qty !== 1 || condition !== 3 || Boolean(photoFile);
    setDirty(dirty);
  }, [name, desc, qty, condition, photoFile, setDirty]);

  useEffect(() => {
    if (!code) return;
    let active = true;
    (async () => {
      const res = await supabase.from("boxes").select("name, code").eq("code", code).maybeSingle();
      if (!active) return;
      const resolvedName = res.data?.name?.trim() || res.data?.code || code;
      setBoxName(resolvedName);
      if (typeof window !== "undefined") {
        localStorage.setItem("activeRoomName", resolvedName);
        window.dispatchEvent(new Event("active-room-changed"));
      }
    })();
    return () => {
      active = false;
    };
  }, [code]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setError("FFE name is required.");
      return;
    }

    setBusy(true);
    setError(null);

    // ✅ Get logged-in user (needed for per-user photo folder)
    const userRes = await supabase.auth.getUser();
    const user = userRes.data.user;

    if (!user) {
      setError("You must be logged in to add FFE.");
      setBusy(false);
      return;
    }

    // 1️⃣ Find box id
    const boxRes = await supabase
      .from("boxes")
      .select("id, location_id, location:locations(project_id)")
      .eq("code", code)
      .maybeSingle();

    if (!boxRes.data || boxRes.error) {
      setError("Room not found.");
      setBusy(false);
      return;
    }

    const boxData = boxRes.data as {
      id: string;
      location_id: string | null;
      location?: { project_id?: string | null } | null;
    } | null;
    const projectId = boxData?.location?.project_id || undefined;
    if (!projectId) {
      setError("Project not found for this room.");
      setBusy(false);
      return;
    }

    // 2️⃣ Create item first
    const safeQty = Math.max(1, Math.floor(Number(qty) || 1));
    const insertRes = await supabase
      .from("items")
      .insert({
        box_id: boxRes.data.id,
        name: name.trim(),
        description: desc.trim() || null,
        quantity: safeQty,
        condition,
      })
      .select("id")
      .single();

    if (insertRes.error || !insertRes.data) {
      setError(insertRes.error?.message || "Failed to create FFE.");
      setBusy(false);
      return;
    }

    const itemId = insertRes.data.id as string;

    // 3️⃣ Create legacy codes for each unit
    const lastCodeRes = await supabase
      .from("item_units")
      .select("legacy_code")
      .eq("project_id", projectId)
      .order("legacy_code", { ascending: false })
      .limit(1);

    const lastCode = lastCodeRes.data?.[0]?.legacy_code || "LEG0000";
    const lastNum = Number(String(lastCode).replace(/\D+/g, "")) || 0;
    const units = Array.from({ length: safeQty }, (_, i) => {
      const nextNum = lastNum + i + 1;
      const codeNum = String(nextNum).padStart(4, "0");
      return {
        item_id: itemId,
        project_id: projectId,
        legacy_code: `LEG${codeNum}`,
      };
    });

    const unitsRes = await supabase.from("item_units").insert(units);
    if (unitsRes.error) {
      setError(unitsRes.error.message || "Failed to create legacy codes.");
      setBusy(false);
      return;
    }

    // 4️⃣ Upload photo if provided
    if (photoFile) {
      let fileToUpload = photoFile;

      try {
        const { compressImageToTarget } = await import("../../../../lib/image");
        const compressed = await compressImageToTarget(photoFile, {
          maxSize: 1280,
          quality: 0.8,
          targetBytes: DEFAULT_MAX_UPLOAD_BYTES,
        });

        if (compressed.size < photoFile.size) fileToUpload = compressed;
      } catch {
        // If compression fails, fall back to the original file
      }

      if (fileToUpload.size > DEFAULT_MAX_UPLOAD_BYTES) {
        setError(`Photo is too large. Max ${DEFAULT_MAX_UPLOAD_MB} MB.`);
        setBusy(false);
        return;
      }

      const ext = (fileToUpload.name.split(".").pop() || "jpg").toLowerCase();

      // ✅ store inside a folder for THIS user
      // example: 123e4567.../itemId-1700000000000.jpg
      const fileName = `${user.id}/${itemId}-${Date.now()}.${ext}`;

      const upload = await supabase.storage
        .from("item-photos")
        .upload(fileName, fileToUpload, {
          upsert: true,
          cacheControl: "3600",
          contentType: fileToUpload.type || "image/jpeg",
        });

      if (upload.error) {
        setError(upload.error.message);
        setBusy(false);
        return;
      }

      const publicUrl = supabase.storage
        .from("item-photos")
        .getPublicUrl(fileName).data.publicUrl;

      await supabase.from("items").update({ photo_url: publicUrl }).eq("id", itemId);
    }

    // 4️⃣ Done → back to box
    setDirty(false);
    router.push(`/box/${encodeURIComponent(code)}`);
  }

  return (
    <RequireAuth>
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
          <h1 className="sr-only" style={{ marginTop: 6 }}>Add FFE</h1>
          <p style={{ opacity: 0.85, marginTop: 0 }}>
            Adding to <strong>{boxName || code}</strong>
          </p>

          {error && <p style={{ color: "crimson" }}>{error}</p>}

          <div style={{ display: "grid", gap: 12 }}>
            <input
              placeholder="FFE name"
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

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 800 }}>Condition (1–5)</span>
              <select value={condition} onChange={(e) => setCondition(Number(e.target.value))}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </label>

            {/* PHOTO PICKERS */}
            <div>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Add photo (optional)</div>

              <input
                id="cam"
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => {
                  setPhotoFile(e.target.files?.[0] ?? null);
                  e.currentTarget.value = "";
                }}
              />

              <input
                id="file"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  setPhotoFile(e.target.files?.[0] ?? null);
                  e.currentTarget.value = "";
                }}
              />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => document.getElementById("cam")?.click()}>
                  Take photo
                </button>
                <button type="button" onClick={() => document.getElementById("file")?.click()}>
                  Choose file
                </button>
                {photoFile && (
                  <span style={{ alignSelf: "center", opacity: 0.7 }}>{photoFile.name}</span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <button onClick={() => { setDirty(false); router.push(`/box/${encodeURIComponent(code)}`); }}>
                Cancel
              </button>

              <button onClick={save} disabled={busy} style={{ background: "#111", color: "#fff" }}>
                {busy ? "Saving..." : "Save FFE"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}
