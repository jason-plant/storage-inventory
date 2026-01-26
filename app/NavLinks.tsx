"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const listRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = 0;
    }
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
        }}
      >
        ☰ Menu
      </button>

      {/* Overlay */}
      {open && (
        <>
          {/* Dark backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              zIndex: 5000,
            }}
          />

          {/* ✅ TRUE bottom sheet */}
          <div
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 6000,

              background: "#fff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              border: "1px solid #e5e7eb",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.25)",

              padding: 14,
              paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)",

              height: "min(360px, 70vh)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>Menu</div>

              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  padding: 0,
                  fontWeight: 900,
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable menu list */}
            <div
              ref={listRef}
              style={{
                flex: 1,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                display: "grid",
                gap: 10,
              }}
            >
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
                    onClick={() => setOpen(false)}
                  >
                    <span>{l.label}</span>
                    <span style={{ opacity: 0.4 }}>›</span>
                  </a>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
