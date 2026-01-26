"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const itemBase: React.CSSProperties = {
  textDecoration: "none",
  color: "#111",
  border: "1px solid #e5e7eb",
  padding: "12px 12px",
  borderRadius: 16,
  fontSize: 16,
  fontWeight: 800,
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  boxShadow: "0 1px 10px rgba(0,0,0,0.06)",
};

const itemActive: React.CSSProperties = {
  background: "#111",
  color: "#fff",
  borderColor: "#111",
};

function isActive(pathname: string, href: string) {
  if (href === "/boxes") return pathname === "/boxes" || pathname.startsWith("/box/");
  if (href === "/locations") return pathname === "/locations" || pathname.startsWith("/locations/");
  return pathname === href || pathname.startsWith(href + "/");
}

export default function NavLinks() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  const links = useMemo(
    () => [
      { href: "/locations", label: "Locations" },
      { href: "/boxes", label: "Boxes" },
      { href: "/search", label: "Search" },
      { href: "/labels", label: "Labels" },
      { href: "/scan", label: "Scan QR" },
    ],
    []
  );

  // Close menu when route changes (so after you tap a link it closes)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape key closes menu (nice on desktop)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {/* Menu button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          borderRadius: 16,
          padding: "10px 12px",
          fontWeight: 900,
          display: "inline-flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Open menu"
      >
        <span aria-hidden>☰</span> Menu
      </button>

      {/* Menu overlay */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 5000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 12,
          }}
        >
          {/* Bottom sheet */}
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#fff",
              borderRadius: 20,
              border: "1px solid #e5e7eb",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              padding: 14,
              paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>Menu</div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                style={{
                  borderRadius: 999,
                  width: 42,
                  height: 42,
                  padding: 0,
                  fontWeight: 900,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {links.map((l) => {
                const active = isActive(pathname, l.href);
                return (
                  <a
                    key={l.href}
                    href={l.href}
                    className="tap-btn"
                    style={{
                      ...itemBase,
                      ...(active ? itemActive : null),
                    }}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <span>{l.label}</span>
                    {/* No "Open →" text. Just a subtle chevron for affordance */}
                    <span aria-hidden style={{ opacity: active ? 0.9 : 0.45 }}>
                      ›
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
