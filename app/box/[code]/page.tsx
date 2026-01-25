"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { supabase } from "../../../lib/supabaseClient";

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

export default function BoxPage() {
  const params = useParams<{ code?: string }>();
  const code = params?.code ? decodeURIComponent(String(params.code)) : "";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [box, setBox] = useState<BoxRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [allBoxes, setAllBoxes] = useState<BoxMini[]>([]);

  // Bulk move
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDestBoxId, setBulkDestBoxId] = useState<string>("");
  const selectedRef = useRef<Set<string>>(new Set());

  // Add item
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState(1);

  // Full screen viewer
  const [viewItem, setViewItem] = useState<ItemRow | null>(null);

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

      const boxesRes = await supabase.from("boxes").select("id, code").order("code");
      setAllBoxes((boxesRes.data ?? []) as BoxMini[]);

      const empty = new Set<string>();
      setSelectedIds(empty);
      selectedRef.current = empty;
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

  function getStoragePathFromPublicUrl(url: string) {
    const marker = "/item-photos/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length);
  }

  async function deleteItemAndPhoto(item: ItemRow) {
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

  async function saveQuantity(itemId: string, qty: number) {
    const safeQty = Math.max(0, Math.floor(qty));
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (safeQty === 0) {
      const ok = window.confirm(`Quantity is 0.\n\nDelete "${item.name}" from this box?`);
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

    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity: safeQty } : i)));
  }

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
    const ok = window.confirm(`Move ${ids.length} item(s) from ${box.code} to ${dest?.code ?? "the selected box"}?`);
    if (!ok) return;

    setBusy(true);
    setError(null);

    const res = await supabase.from("items").update({ box_id: bulkDestBoxId }).in("id", ids);
    if (res.error) {
      setError(res.error.message);
      setBusy(false);
      return;
    }

    setItems((prev) => prev.filter((i) => !selectedRef.current.has(i.id)));
    clearSelected();
    setBulkDestBoxId("");
    setBusy(false);
  }

  async function uploadPhoto(itemId: string, file: File) {
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${itemId}-${Date.now()}.${ext}`;

    const upload = await supabase.storage.from("item-photos").upload(fileName, file, { upsert: true });
    if (upload.error) {
      setError(upload.error.message);
      return;
    }

    const publicUrl = supabase.storage.from("item-photos").getPublicUrl(fileName).data.publicUrl;

    await supabase.from("items").update({ photo_url: publicUrl }).eq("id", itemId);

    if (box) await reloadItems(box.id);
  }

  async function printSingleQrLabel(boxCode: string, name?: string | null, location?: string | null) {
    const url = `${window.location.origin}/box/${encodeURIComponent(boxCode)}`;
    const qr = await QRCode.toDataURL(url, { width: 420 });

    const w = window.open("", "_blank");
    if (!w) return;

    w.document.write(`
      <html>
        <body style="font-family:Arial;padding:20px">
          <div style="width:320px;border:2px solid #000;padding:14px;border-radius:12px">
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

  if (loading) return <p>Loading…</p>;
  if (!box) return <p>Box not found.</p>;

  const destinationBoxes = allBoxes.filter((b) => b.id !== box.id);
  const selectedCount = selectedIds.size;

  return (
    <main style={{ fontFamily: "inherit" }}>
      {/* Header card */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 14,
          boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 6px 0" }}>{box.code}</h1>
            {box.name && <div style={{ fontWeight: 800 }}>{box.name}</div>}
            {box.location && <div style={{ opacity: 0.8 }}>Location: {box.location}</div>}
          </div>

          <button onClick={() => printSingleQrLabel(box.code, box.name, box.location)} className="full-width-mobile">
            Print QR label
          </button>
        </div>

        {error && <p style={{ color: "crimson", marginTop: 10 }}>Error: {error}</p>}
      </div>

      {/* Add item card */}
      <div
        style={{
          marginTop: 12,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 14,
          boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
        }}
      >
        <h2 style={{ margin: "0 0 10px 0" }}>Add Item</h2>

        <div style={{ display: "grid", gap: 10 }}>
          <input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <input type="number" min={1} value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} />

          <button onClick={addItem} disabled={busy}>
            {busy ? "Working..." : "Add item"}
          </button>
        </div>
      </div>

      {/* Bulk move card */}
      <div
        style={{
          marginTop: 12,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 14,
          boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
        }}
      >
        <h2 style={{ margin: "0 0 10px 0" }}>Move selected items</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <button type="button" onClick={selectAll} disabled={items.length === 0}>
            Select all
          </button>
          <button type="button" onClick={clearSelected} disabled={selectedCount === 0}>
            Clear
          </button>

          <div style={{ alignSelf: "center", opacity: 0.85 }}>
            Selected: <strong>{selectedCount}</strong>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <select value={bulkDestBoxId} onChange={(e) => setBulkDestBoxId(e.target.value)}>
            <option value="">Select destination box…</option>
            {destinationBoxes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}
              </option>
            ))}
          </select>

          <button onClick={moveSelected} disabled={busy || selectedCount === 0 || !bulkDestBoxId}>
            {busy ? "Moving..." : "Move selected"}
          </button>
        </div>
      </div>

      {/* Items list */}
      <h2 style={{ margin: "14px 0 8px" }}>Items</h2>

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((i) => {
          const checked = selectedIds.has(i.id);
          const hasPhoto = Boolean(i.photo_url);

          return (
            <div
              key={i.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                padding: 14,
                boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
              }}
            >
              {/* Top line: checkbox + name (tap name to view photo) */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSelected(i.id)}
                  style={{ transform: "scale(1.25)" }}
                />

                <button
                  type="button"
                  onClick={() => {
                    if (hasPhoto) setViewItem(i);
                  }}
                  disabled={!hasPhoto}
                  style={{
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    boxShadow: "none",
                    textAlign: "left",
                    fontWeight: 900,
                    cursor: hasPhoto ? "pointer" : "default",
                    opacity: hasPhoto ? 1 : 0.9,
                  }}
                  title={hasPhoto ? "Tap to view photo" : "No photo yet"}
                >
                  {i.name}
                  {hasPhoto ? <span style={{ marginLeft: 8, opacity: 0.6 }}>📷</span> : null}
                </button>
              </div>

              {i.description && <div style={{ marginTop: 8, opacity: 0.9 }}>{i.description}</div>}

              {/* Quantity editor */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) =>
                      prev.map((it) =>
                        it.id === i.id ? { ...it, quantity: Math.max(0, (it.quantity ?? 0) - 1) } : it
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
                      prev.map((it) => (it.id === i.id ? { ...it, quantity: Number(e.target.value) } : it))
                    )
                  }
                  style={{ width: 110 }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) =>
                      prev.map((it) => (it.id === i.id ? { ...it, quantity: (it.quantity ?? 0) + 1 } : it))
                    )
                  }
                >
                  +
                </button>

                <button type="button" onClick={() => saveQuantity(i.id, i.quantity ?? 0)}>
                  Save
                </button>
              </div>

              {/* Photo upload */}
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 8, opacity: 0.85 }}>Add / change photo:</div>

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

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => document.getElementById(`cam-${i.id}`)?.click()}>
                    Take photo
                  </button>
                  <button type="button" onClick={() => document.getElementById(`file-${i.id}`)?.click()}>
                    Choose file
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FULL SCREEN VIEWER */}
      {viewItem && viewItem.photo_url && (
        <div
          onClick={() => setViewItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 12,
          }}
        >
          <img
            src={viewItem.photo_url}
            alt={viewItem.name}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 16 }}
          />
        </div>
      )}
    </main>
  );
}
