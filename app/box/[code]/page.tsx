"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import QRCode from "qrcode";


type BoxRow = {
  id: string;
  code: string;
  name: string | null;
  location: string | null;
  notes: string | null;
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
  const [error, setError] = useState<string | null>(null);

  const [box, setBox] = useState<BoxRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);

  // Add-item form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState(1);

  // Load box + items
  useEffect(() => {
    if (!code) return;

    async function load() {
      setLoading(true);
      setError(null);

      const boxRes = await supabase
        .from("boxes")
        .select("id, code, name, location, notes")
        .eq("code", code)
        .maybeSingle();

      if (boxRes.error) {
        setError(boxRes.error.message);
        setLoading(false);
        return;
      }

      if (!boxRes.data) {
        setError(`Box not found for code: ${code}`);
        setLoading(false);
        return;
      }

      setBox(boxRes.data);

      const itemsRes = await supabase
        .from("items")
        .select("id, name, description, photo_url, quantity")
        .eq("box_id", boxRes.data.id)
        .order("name", { ascending: true });

      if (itemsRes.error) {
        setError(itemsRes.error.message);
        setItems([]);
      } else {
        setItems(itemsRes.data ?? []);
      }

      setLoading(false);
    }

    load();
  }, [code]);

  // Helper: reload items for current box
  async function reloadItems(currentBoxId: string) {
    const itemsRes = await supabase
      .from("items")
      .select("id, name, description, photo_url, quantity")
      .eq("box_id", currentBoxId)
      .order("name", { ascending: true });

    if (itemsRes.error) {
      setError(itemsRes.error.message);
      setItems([]);
    } else {
      setItems(itemsRes.data ?? []);
    }
  }

  // Add item to this box
  async function addItem() {
    if (!box) return;

    const name = newName.trim();
    if (!name) {
      setError("Item name is required.");
      return;
    }

    setError(null);

    const { error: insertError } = await supabase.from("items").insert([
      {
        name,
        description: newDesc.trim() || null,
        quantity: newQty || 1,
        box_id: box.id,
      },
    ]);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    // Clear the form
    setNewName("");
    setNewDesc("");
    setNewQty(1);

    // Reload items list
    await reloadItems(box.id);
  }

  // Upload photo for an item + save public URL
  async function uploadPhoto(itemId: string, file: File) {
    setError(null);

    // You must have a public bucket called: item-photos
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${itemId}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const uploadRes = await supabase.storage
      .from("item-photos")
      .upload(filePath, file, { upsert: true });

    if (uploadRes.error) {
      setError(uploadRes.error.message);
      return;
    }

    const publicUrlRes = supabase.storage
      .from("item-photos")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlRes.data.publicUrl;

    const { error: updateError } = await supabase
      .from("items")
      .update({ photo_url: publicUrl })
      .eq("id", itemId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (box) {
      await reloadItems(box.id);
    }
  }
async function downloadQrForBox(boxCode: string) {
  // This makes a QR that opens the box page
  const url = `${window.location.origin}/box/${encodeURIComponent(boxCode)}`;

  const dataUrl = await QRCode.toDataURL(url, { margin: 2, width: 400 });

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${boxCode}-qr.png`;
  link.click();
}

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <p>
        <a href="/boxes">← Back to Boxes</a>
      </p>

      {!code && <p>Loading…</p>}

      {code && loading && <p>Loading box…</p>}

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {!loading && !error && box && (
        <>
          <h1>{box.code}</h1>

          {box.name && (
            <p>
              <strong>{box.name}</strong>
            </p>
          )}

          {box.location && <p>Location: {box.location}</p>}
<button
  type="button"
  onClick={() => downloadQrForBox(box.code)}
  style={{
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #444",
    cursor: "pointer",
    marginTop: 10,
  }}
>
  Download QR for this box
</button>

          <hr style={{ margin: "16px 0" }} />

          <h2>Items ({items.length})</h2>

          {/* Add Item form */}
          <div
            style={{
              border: "1px solid #333",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Add Item</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Item name (required)"
                style={{ padding: 8, borderRadius: 6, border: "1px solid #444" }}
              />

              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                style={{ padding: 8, borderRadius: 6, border: "1px solid #444" }}
              />

              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value))}
                min={1}
                style={{
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #444",
                  width: 120,
                }}
              />

              <button
                onClick={addItem}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #444",
                  cursor: "pointer",
                }}
              >
                Add item to this box
              </button>
            </div>
          </div>

          {/* Items list */}
          {items.length === 0 ? (
            <p>No items in this box yet.</p>
          ) : (
            <ul style={{ paddingLeft: 18 }}>
              {items.map((i) => (
                <li key={i.id} style={{ marginBottom: 16 }}>
                  <strong>{i.name}</strong>
                  {i.quantity ? ` (x${i.quantity})` : ""}
                  {i.description ? <div>{i.description}</div> : null}

                  {i.photo_url ? (
                    <div style={{ marginTop: 6 }}>
                      <img
                        src={i.photo_url}
                        alt={i.name}
                        style={{ maxWidth: 220, borderRadius: 8 }}
                      />
                    </div>
                  ) : null}

                  {/* Upload photo control */}
                  <div style={{ marginTop: 10 }}>
  <div style={{ marginBottom: 6 }}>Add / change photo:</div>

  <input
    id={`file-${i.id}`}
    type="file"
    accept="image/*"
    style={{ display: "none" }}
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) uploadPhoto(i.id, file);
      // allow re-selecting the same file again later
      e.currentTarget.value = "";
    }}
  />

  <button
    type="button"
    onClick={() => {
      const el = document.getElementById(`file-${i.id}`) as HTMLInputElement | null;
      el?.click();
    }}
    style={{
      padding: "10px 12px",
      borderRadius: 8,
      border: "1px solid #444",
      cursor: "pointer",
    }}
  >
    Choose photo
  </button>
</div>

                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
