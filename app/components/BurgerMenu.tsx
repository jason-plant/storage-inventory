"use client";

import React, { useEffect, useRef, useState } from "react";
import NavBarLinks from "../NavBarLinks";

export default function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // Focus the panel for accessibility / keyboard
    setTimeout(() => panelRef.current?.focus(), 10);

    // Stop background scroll when menu is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      {/* Burger button (top right) */}
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
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
          cursor: "pointer",
        }}
      >
        {/* burger icon */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#111"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      </button>

      {/* Overlay + Drawer */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            // close when clicking the dark backdrop
            if (e.target === e.currentTarget) setOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5000,
            background: "rgba(0,0,0,0.55)",
          }}
        >
          <div
            ref={panelRef}
            tabIndex={-1}
            onMouseDown={(e) => {
              // prevent closing when clicking inside panel
              e.stopPropagation();
            }}
            onClickCapture={(e) => {
              // If user clicks any link inside the menu, close it
              const target = e.target as HTMLElement | null;
              if (!target) return;

              // close when clicking anchors (links)
              if (target.closest("a")) setOpen(false);

              // close when clicking logout button etc.
              if (target.closest("button") && target.getAttribute("aria-label") !== "Close menu") {
                // allow close on logout too
                setOpen(false);
              }
            }}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              height: "100%",
              width: "min(86vw, 360px)",
              background: "#fff",
              borderLeft: "1px solid #e5e7eb",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.25)",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>Menu</div>

              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <NavBarLinks />
            </div>

            <div style={{ marginTop: "auto", opacity: 0.6, fontSize: 12 }}>
              Tip: tap outside the menu to close.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
