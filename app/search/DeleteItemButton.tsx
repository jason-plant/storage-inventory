
import { useState } from "react";
import DeleteIconButton from "../components/DeleteIconButton";
import Modal from "../components/Modal";
import { supabase } from "../lib/supabaseClient";

export function DeleteItemButton({ itemId, onDeleted }: { itemId: string, onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const [modalOpen, setModalOpen] = useState(false);

  async function handleDeleteConfirmed() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("items").delete().eq("id", itemId);
    setBusy(false);
    if (error) {
      setError(error.message);
    } else {
      setModalOpen(false);
      onDeleted();
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      <DeleteIconButton onClick={() => setModalOpen(true)} disabled={busy} />
      <Modal open={modalOpen} title="Delete FFE?" onClose={() => setModalOpen(false)} anchor="center">
        <div style={{ marginBottom: 18 }}>Are you sure you want to delete this FFE?</div>
        {error && <div style={{ color: "crimson", marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={() => setModalOpen(false)} disabled={busy}>Cancel</button>
          <button type="button" onClick={handleDeleteConfirmed} disabled={busy} style={{ background: "#ef4444", color: "#fff" }}>
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
    </span>
  );
}
