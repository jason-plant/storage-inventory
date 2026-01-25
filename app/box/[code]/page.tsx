"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { supabase } from "../../../lib/supabaseClient";

/* ================= TYPES ================= */

type BoxRow = {
  id: string;
  code: string;
  name: string | null;
  location: string | null;
};

type BoxMini = {
  id: string;
  code: string;
};

type ItemRow = {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  quantity: number | null;
};

/* ================= PAGE ================= */

export default function BoxPage() {
  const params = useParams<{ code?: string }>();
  const code = params?.code ? decodeURIComponent(String(params.code)) : "";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [box, setBox] = useState<BoxRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);

  // all boxes list for move dropdowns
  const [allBoxes, setAllBoxes] = useState<BoxMini[]>([]);

  // Bulk move state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDestBoxId, setBulkDestBoxId] = useState<string>("");

  // Add item form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState(1);

  // Full-screen viewer
  const [viewItem, setViewItem] = useState<ItemRow | null>(null);

  // keep a ref so we can safely update Set state
  const selectedRef = useRef<Set<string>>(new Set());

  /* ================= LOAD ================= */

  useEffect(() => {
    if (!code) return;

    async function load() {
      setLoading(true);
      setError(null);

      const boxRes = await supabase
        .from("boxes")
        .select("id, code, name, location")
        .eq("code", code)
        .maybeSingle();

      if (!boxRes.data || boxRes.error) {
        setError("Box not found");
        setLoading(false);
        return;
      }

      setBox(boxRes.data);

      const itemsRes = await supabase
        .from("items")
        .select("id, name, description, photo_url, quantity")
        .eq("box_id", boxRes.data.id)
        .order("name");

      setItems(itemsRes.data ?? []);
      setSelectedIds(new Set());
      selectedRef.current = new Set();

      const boxesRes = await supabase.from("boxes").select("id, code").order("code");
      setAllBoxes((boxesRes.data ?? []) as BoxMini[]);

      setBulkDestBoxId("");
      setLoading(false);
    }

    load();
  }, [code]);

  async function reloadItems(boxId: string) {
    const { data } = await supabase
      .from("items")
      .select("id, name, description, photo_url, quantity")
      .eq("box_id", boxId)
      .order("name");

    setItems(data ?? []);
  }

  /* ================= ADD ITEM ================= */

  async function addItem() {
    if (!box || !newName.trim()) return;

    setBusy(true);
    setError(null);

    const { error } = await supabase.from("items").insert({
      box_id: box.id,
      name: newName.trim(),
      description: newDesc.trim() || null,
      quantity: newQty,
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    setNewName("");
    setNewDesc("");
    setNewQty(1);

    await reloadItems(box.id);
    setBusy(false);
  }

  /* ================= DELETE HELPERS ================= */

  function getStoragePathFromPublicUrl(url: string) {
    const marker = "/item-photos/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length);
  }

  async function deleteItemAndPhoto(item: ItemRow) {
    // delete photo if exists (best-effort)
    if (item.photo_url) {
      const path = getStoragePathFromPublicUrl(item.photo_url);
      if (path) {
        await supabase.storage.from("item-photos").remove([path]);
      }
    }

    const delRes = await supabase.from("items").delete().eq("id", item.id);
    if (delRes.error) {
      setError(delRes.error.message);
      return;
    }

    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      copy.delete(item.id);
      selectedRef.current = copy;
      return copy;
    });
  }

  /* ================= SAVE QUANTITY ================= */

  async function saveQuantity(itemId: string, qty: number) {
    const safeQty = Math.max(0, Math.floor(qty));
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (safeQty === 0) {
      const ok = window.confirm(
        `Quantity is 0.\n\nDelete "${item.name}" from this box?`
      );
      if (ok) {
        await deleteItemAndPhoto(item);
      } else if (box) {
        await reloadItems(box.id);
      }
      return;
    }

    const res = await supabase.from("items").update({ quantity: safeQty }).eq("id", itemId);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: safeQty } : i))
    );
  }

  /* ================= BULK MOVE ================= */

  function toggleSelected(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      selectedRef.current = next;
      return next;
    });
  }

  function selectAll() {
    const all = new Set(items.map((i) => i.id));
    setSelectedIds(all);
    selectedRef.current = all;
  }

  function clearSelected() {
    const empty = new Set<string>();
    setSelectedIds(empty);
    selectedRef.current = empty;
  }

  async function moveSelected() {
    if (!box) return;

    const ids = Array.from(selectedRef.current);
    if (ids.length === 0) {
      alert("Tick at least one item first.");
      return;
    }

    if (!bulkDestBoxId) {
      alert("Choose a destination box first.");
      return;
    }

    const dest = allBoxes.find((b) => b.id === bulkDestBoxId);
    const ok = window.confirm(
      `Move ${ids.length} item(s) from ${box.code} to ${dest?.code ?? "the selected box"}?`
    );
    if (!ok) return;

    setBusy(true);
    setError(null);

    const res = await supabase.from("items").update({ box_id: bulkDestBoxId }).in("id", ids);

    if (res.error) {
      setError(res.error.message);
      setBusy(false);
      return;
    }

    // Remove moved items from current list
    setItems((prev) => prev.filter((i) => !selectedRef.current.has(i.id)));

    // Clear selection
    clearSelected();
    setBulkDestBoxId("");
    setBusy(false);
  }

  /* ================= PHOTO UPLOAD ================= */

  async function uploadPhoto(itemId: string, file: File) {
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${itemId}-${Date.now()}.${ext}`;

    const upload = await supabase.storage
      .from("item-photos")
      .upload(fileName, file, { upsert: true });

    if (upload.error) {
      setError(upload.error.message);
      return;
    }

    const publicUrl = supabase.storage
      .from("item-photos")
      .getPublicUrl(fileName).data.publicUrl;

    await supabase.from("items").update({ photo_url: publicUrl }).eq("id", itemId);

    if (box) await reloadItems(box.id);
  }

  /* ================= PRINT QR ================= */

  async function printSingleQrLabel(
    boxCode: string,
    name?: string | null,
    location?: string | null
  ) {
    const url = `${window.location.origin}/box/${encodeURIComponent(boxCode)}`;
    const qr = await QRCode.toDataURL(url, { width: 420 });

    const w = window.open("", "_blank");
    if (!w) return;

    w.document.write(`
      <html>
        <body style="font-family:Arial;padding:20px">
          <div style="width:320px;border:2px solid #000;padding:14px">
            <div style="font-size:22px;font-weight:800">${boxCode}</div>
            ${name ? `<div>${name}</div>` : ""}
            ${location ? `<div>Location: ${location}</div>` : ""}
            <img src="${qr}" style="width:100%" />
            <div style="font-size:10px">${url}</div>
          </div>
          <script>window.onload=()=>window.print()</script>
        </body>
      </html>
    `);
  }

  /* ================= RENDER ================= */

  if (loading) return <p>Loading…</p>;
  if (!box) return <p>Box not found.</p>;

  const destinationBoxes = allBoxes.filter((b) => b.id !== box.id);
  const selectedCount = selectedIds.size;

  return (
    <main style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>{box.code}</h1>
      {box.name && <strong>{box.name}</strong>}
      {box.location && <div>Location: {box.location}</div>}

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      <button onClick={() => printSingleQrLabel(box.code, box.name, box.location)}>
        Print QR label
      </button>

      <hr />

      <h2>Add Item</h2>
      <input
        placeholder="Name"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
      />
      <input
        placeholder="Description"
        value={newDesc}
        onChange={(e) => setNewDesc(e.target.value)}
      />
      <input
        type="number"
        min={1}
        value={newQty}
        onChange={(e) => setNewQty(Number(e.target.value))}
      />
      <button onClick={addItem} disabled={busy}>
        {busy ? "Working..." : "Add"}
      </button>

      <hr />

      {/* BULK MOVE BAR */}
      <div
        style={{
          border: "1px solid #333",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Move selected items</h2>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <button type="button" onClick={selectAll} disabled={items.length === 0}>
            Select all
          </button>
          <button type="button" onClick={clearSelected} disabled={selectedCount === 0}>
            Clear
          </button>

          <div style={{ opacity: 0.85, alignSelf: "center" }}>
            Selected: <strong>{selectedCount}</strong>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={bulkDestBoxId}
            onChange={(e) => setBulkDestBoxId(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #444",
              minWidth: 180,
            }}
          >
            <option value="">Select destination box…</option>
            {destinationBoxes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={moveSelected}
            disabled={busy || selectedCount === 0 || !bulkDestBoxId}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #444",
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {busy ? "Moving..." : "Move selected"}
          </button>
        </div>
      </div>

      <h2>Items</h2>

      <ul style={{ paddingLeft: 18 }}>
        {items.map((i) => {
          const checked = selectedIds.has(i.id);

          return (
            <li key={i.id} style={{ marginBottom: 22 }}>
              {/* Checkbox + name */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSelected(i.id)}
                  style={{ transform: "scale(1.2)" }}
                />
                <strong>{i.name}</strong>
              </div>

              {/* Quantity editor */}
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <button
                  onClick={() =>
                    setItems((prev) =>
                      prev.map((it) =>
                        it.id === i.id
                          ? { ...it, quantity: Math.max(0, (it.quantity ?? 0) - 1) }
                          : it
                      )
                    )
                  }
                >
                  −
                </button>

                <input
                  type="number"
                  min={0}
                  value={i.quantity ?? 0}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it) =>
                        it.id === i.id
                          ? { ...it, quantity: Number(e.target.value) }
                          : it
                      )
                    )
                  }
                  style={{ width: 80 }}
                />

                <button
                  onClick={() =>
                    setItems((prev) =>
                      prev.map((it) =>
                        it.id === i.id
                          ? { ...it, quantity: (it.quantity ?? 0) + 1 }
                          : it
                      )
                    )
                  }
                >
                  +
                </button>

                <button onClick={() => saveQuantity(i.id, i.quantity ?? 0)}>Save</button>
              </div>

              {i.description && <div>{i.description}</div>}

              {/* Show item (full screen) */}
              {i.photo_url && (
                <button style={{ marginTop: 8 }} onClick={() => setViewItem(i)}>
                  Show item
                </button>
              )}

              {/* Photo upload */}
              <div style={{ marginTop: 10 }}>
                <div style={{ marginBottom: 6 }}>Add / change photo:</div>

                <input
                  id={`cam-${i.id}`}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPhoto(i.id, file);
                    e.currentTarget.value = "";
                  }}
                />

                <input
                  id={`file-${i.id}`}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPhoto(i.id, file);
                    e.currentTarget.value = "";
                  }}
                />

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => document.getElementById(`cam-${i.id}`)?.click()}>
                    Take photo
                  </button>
                  <button onClick={() => document.getElementById(`file-${i.id}`)?.click()}>
                    Choose file
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* FULL SCREEN VIEWER */}
      {viewItem && viewItem.photo_url && (
        <div
          onClick={() => setViewItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <img
            src={viewItem.photo_url}
            alt={viewItem.name}
            style={{
              maxWidth: "95%",
              maxHeight: "95%",
              objectFit: "contain",
            }}
          />
        </div>
      )}
    </main>
  );
}
