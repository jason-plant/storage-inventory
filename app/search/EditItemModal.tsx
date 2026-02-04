import React, { useState, useEffect, useRef } from "react";
import Modal from "../components/Modal";

export default function EditItemModal({
  open,
  item,
  onClose,
  onSave
}: {
  open: boolean;
  item: any;
  onClose: () => void;
  onSave: (updated: any) => void;
}) {

  const [name, setName] = useState(item?.name || "");
  const [desc, setDesc] = useState(item?.description || "");
  const [qty, setQty] = useState(item?.quantity || 0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState(item?.photo_url || "");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Pre-populate fields when item changes
  useEffect(() => {
    setName(item?.name || "");
    setDesc(item?.description || "");
    setQty(item?.quantity || 0);
    setPhotoUrl(item?.photo_url || "");
    setPhotoFile(null);
  }, [item]);

  function handleSave() {
    onSave({ ...item, name, description: desc, quantity: qty, photoFile });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    if (file) {
      setPhotoUrl(URL.createObjectURL(file));
    }
  }

  function handleTakePhoto() {
    if (fileInputRef.current) {
      fileInputRef.current.capture = "environment";
      fileInputRef.current.click();
    }
  }

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Edit FFE">
      <div className="p-4">
        <h2 className="text-lg font-bold mb-2">Edit FFE</h2>
        <label className="block mb-2">
          Name
          <input className="border p-1 w-full" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className="block mb-2">
          Description
          <input className="border p-1 w-full" value={desc} onChange={e => setDesc(e.target.value)} />
        </label>
        <label className="block mb-2">
          Quantity
          <input type="number" className="border p-1 w-full" value={qty} onChange={e => setQty(Number(e.target.value))} />
        </label>
        <label className="block mb-2">
          Photo
          <div className="flex items-center gap-2 mt-1">
            {photoUrl && (
              <img src={photoUrl} alt="Item" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #ccc" }} />
            )}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="bg-gray-200 px-2 py-1 rounded"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Photo
            </button>
            <button
              type="button"
              className="bg-gray-200 px-2 py-1 rounded"
              onClick={handleTakePhoto}
            >
              Take Photo
            </button>
          </div>
        </label>
        <div className="flex gap-2 mt-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleSave}>Save</button>
          <button className="bg-gray-300 px-4 py-2 rounded" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
