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
  const [error, setError] = useState<string | null>(null);

  const [box, setBox] = useState<BoxRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);

  // all boxes list for "move to"
  const [allBoxes, setAllBoxes] = useState<BoxMini[]>([]);
  // per-item selected destination box id
  const [moveTo, setMoveTo] = useState<Record<string, string>>({});

  // Add item form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState(1);

  // Full-screen viewer
  const [viewItem, setViewItem] = useState<ItemRow | null>(null);

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

      // Load items in this box
      const itemsRes = await supabase
        .from("items")
        .select("id, name, description, photo_url, quantity")
        .eq("box_id", boxRes.data.id)
        .order("name");

      setItems(itemsRes.data ?? []);

      // Load all boxes for move dropdown
      const boxesRes = await supabase
        .from("boxes")
        .select("id, code")
        .order("code");

      setAllBoxes((boxesRes.data ?? []) as BoxMini[]);

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

    const { error } = await supabase.from("items").insert({
      box_id: box.id,
      name: newName.trim(),
      description: newDesc.trim() || null,
      quantity: newQty,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setNewName("");
    setNewDesc("");
    setNewQty(1);

    await reloadItems(box.id);
  }

  /* ================= DELETE HELPERS ================= */

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

    await supabase.from("items").delete().eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
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

    const res = await supabase
      .from("items")
      .update({ quantity: safeQty })
      .eq("id", itemId);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: safeQty } : i))
    );
  }

  /* ================= MOVE ITEM ================= */

  async function moveItem(item: ItemRow) {
    if (!box) return;

    const destBoxId = moveTo[item.id];
    if (!destBoxId) {
      alert("Choose a destination box first.");
      return;
    }

    const dest = allBoxes.find((b) => b.id === destBoxId);
    const ok = window.confirm(
      `Move "${item.name}" from ${box.code} to ${dest?.code ?? "the selected box"}?`
    );
    if (!ok) return;

    const res = await supabase
      .from("items")
      .update({ box_id: destBoxId })
      .eq("id", item.id);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    // Remove from current UI list (because it's no longer in this box)
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    // Clear dropdown selection for this item
    setMoveTo((prev) => {
      const copy = { ...prev };
      delete copy[item.id];
      return copy;
    });
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

  // destination options exclude current box
  const destinationBoxes = allBoxes.filter((b) => b.id !== box.id);

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
      <button onClick={addItem}>Add</button>

      <hr />

      <h2>Items</h2>

      <ul style={{ paddingLeft: 18 }}>
        {items.map((i) => (
          <li key={i.id} style={{ marginBottom: 22 }}>
            <strong>{i.name}</strong>

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
                      it.id === i.id ? { ...it, quantity: (it.quantity ?? 0) + 1 } : it
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

            {/* Move item controls */}
            <div style={{ marginTop: 10 }}>
              <div style={{ marginBottom: 6 }}>Move to another box:</div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  value={moveTo[i.id] ?? ""}
                  onChange={(e) =>
                    setMoveTo((prev) => ({ ...prev, [i.id]: e.target.value }))
                  }
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #444",
                    minWidth: 160,
                  }}
                >
                  <option value="">Select box…</option>
                  {destinationBoxes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => moveItem(i)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #444",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Move
                </button>
              </div>
            </div>

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
        ))}
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
