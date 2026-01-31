"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "./UnsavedChangesProvider";

export default function BackButton({ fallback = "/locations" }: { fallback?: string }) {
  const router = useRouter();

  const { isDirty, setDirty } = useUnsavedChanges();

  function goBack() {
    if (isDirty) {
      const ok = confirm("You have unsaved changes. Discard and go back?");
      if (!ok) return;
      // user confirmed — clear dirty flag and navigate
      setDirty(false);
    }

    // If there's a history entry, go back; otherwise navigate to a safe fallback
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={goBack}
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        background: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
        marginRight: 6,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#111"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
