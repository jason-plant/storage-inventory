"use client";

import React from "react";
import { usePathname } from "next/navigation";

const linkBase: React.CSSProperties = {
  textDecoration: "none",
  color: "#111",
  border: "1px solid #ddd",
  padding: "10px 12px",
  borderRadius: 14,
  fontSize: 14,
  fontWeight: 800,
  background: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

function isActive(pathname: string, href: string) {
  if (href === "/boxes") return pathname === "/" || pathname.startsWith("/boxes") || pathname.startsWith("/box/");
  return pathname === href || pathname.startsWith(href + "/");
}

export default function NavBarLinks() {
  const pathname = usePathname() || "/";

  // Hide navbar on auth pages only
  const hideNav = pathname.startsWith("/login") || pathname.startsWith("/signup");

  if (hideNav) return null;

  const links = [
    { href: "/locations", label: "Locations" },
    { href: "/boxes", label: "Boxes" },
    { href: "/search", label: "Search" },
    { href: "/labels", label: "Labels" },
    { href: "/scan", label: "Scan QR" },
  ];

  return (
    <>
      <style>{`
        /* Make form controls feel "app-like" */
        input, select, button, textarea {
          font-size: 16px; /* prevents iOS zoom */
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          padding: 12px 12px;
          box-sizing: border-box;
        }

        button {
          background: #fff;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 1px 10px rgba(0,0,0,0.06);
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Mobile stacking */
        @media (max-width: 600px) {
          .nav-wrap { flex-direction: column; align-items: flex-start; }
          .nav-links { width: 100%; }
          .nav-links a { flex: 1; text-align: center; }
        }
      `}</style>

      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(246,246,247,0.9)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #eaeaea",
        }}
      >
        <div
          className="nav-wrap"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <a
            href="/boxes"
            style={{
              fontWeight: 900,
              textDecoration: "none",
              color: "#111",
              fontSize: 18,
            }}
          >
            Storage Inventory
          </a>

          <div className="nav-links" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {links.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <a
                  key={l.href}
                  href={l.href}
                  style={{
                    ...linkBase,
                    background: active ? "#111" : "#fff",
                    color: active ? "#fff" : "#111",
                    borderColor: active ? "#111" : "#ddd",
                  }}
                  aria-current={active ? "page" : undefined}
                >
                  {l.label}
                </a>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
