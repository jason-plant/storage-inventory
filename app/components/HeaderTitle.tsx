"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLocations,
  IconBoxes,
  IconSearch,
  IconLabels,
  IconScanQR,
  IconScanItem,
  IconHome,
} from "./Icons";

export default function HeaderTitle() {
  const pathname = usePathname() || "/";

  const meta = useMemo(() => {
    // return { title, iconComponent, href }
    if (pathname === "/" || pathname === "/locations") return { title: "Locations", Icon: IconLocations, href: "/locations" };
    if (pathname.startsWith("/boxes")) return { title: "Boxes", Icon: IconBoxes, href: "/boxes" };
    if (pathname.startsWith("/search")) return { title: "Search", Icon: IconSearch, href: "/search" };
    if (pathname.startsWith("/labels")) return { title: "Labels", Icon: IconLabels, href: "/labels" };
    if (pathname.startsWith("/scan-item")) return { title: "Scan Item", Icon: IconScanItem, href: "/scan-item" };
    if (pathname.startsWith("/scan")) return { title: "Scan QR", Icon: IconScanQR, href: "/scan" };
    if (pathname.startsWith("/box/")) {
      // show the box code (segment 2) if present
      const parts = pathname.split("/").filter(Boolean);
      const code = parts[1] ? decodeURIComponent(parts[1]) : "Box";
      return { title: code, Icon: IconBoxes, href: `/box/${encodeURIComponent(code)}` };
    }
    return { title: "Storage Inventory", Icon: IconHome, href: "/locations" };
  }, [pathname]);

  const Icon = meta.Icon;

  return (
    <Link
      href={meta.href}
      style={{ textDecoration: "none", color: "#111", display: "flex", alignItems: "center", gap: 10 }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          flex: "0 0 auto",
        }}
      >
        <Icon />
      </div>

      <span style={{ fontWeight: 900, fontSize: 18 }}>{meta.title}</span>
    </Link>
  );
}
