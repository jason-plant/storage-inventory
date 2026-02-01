"use client";

import React, { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Modal from "./Modal";

export default function HelpButton() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  const meta = useMemo(() => {
    if (pathname === "/" || pathname === "/locations")
      return { title: "Locations", content: (
        <>
          <p>Start here to organize where your boxes live.</p>
          <ul>
            <li>Tap <strong>New</strong> to add a location (e.g., Garage, Closet).</li>
            <li>Use the edit/delete icons on a location card to rename or remove it.</li>
            <li>Select a location card to view and manage its boxes.</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/locations/"))
      return { title: "Location", content: (
        <>
          <p>Manage all boxes stored in this location.</p>
          <ul>
            <li>Tap <strong>New</strong> to create a box in this location.</li>
            <li>Use edit/delete icons on a box card to rename or remove it.</li>
            <li>Select a box card to open it and manage its items.</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/boxes"))
      return { title: "Boxes", content: (
        <>
          <p>Browse and manage all boxes across locations.</p>
          <ul>
            <li>Tap a box to open it and see items inside.</li>
            <li>Use the edit/delete icons on a box card to update details.</li>
            <li>Tap <strong>New</strong> to create a box and assign a location.</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/box/"))
      return { title: "Box", content: (
        <>
          <p>Manage items stored in this box.</p>
          <ul>
            <li>Tap an item to edit its name, quantity, description, or photo.</li>
            <li>Use the + button to add a new item to this box.</li>
            <li>Use Edit/Delete on items, or edit the box details as needed.</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/labels"))
      return { title: "Labels", content: (
        <>
          <p>Create, print, or share QR labels for your boxes.</p>
          <ul>
            <li>Long-press a label to select multiple boxes.</li>
            <li>Pick a layout (Default, 40×30 mm, 50×80 mm) and number of copies.</li>
            <li>Print, export PDF, share images, or try Bluetooth printing (device support varies).</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/scan-item") || pathname.startsWith("/scan"))
      return { title: "Scan", content: (
        <>
          <p>Scan a barcode or QR code to jump to a box or item.</p>
          <ul>
            <li>Allow camera access when prompted.</li>
            <li>Hold the code steady in the frame for quick detection.</li>
            <li>Results open the matching box or item automatically.</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/search"))
      return { title: "Search", content: (
        <>
          <p>Find boxes or items quickly across your inventory.</p>
          <ul>
            <li>Type a box code, box name, location, or item name to search.</li>
            <li>Select a result to open the box or item details.</li>
            <li>Use edit actions from results to update items fast.</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/login") || pathname.startsWith("/signup"))
      return { title: "Account", content: (
        <>
          <p>Sign in to access your inventory from any device.</p>
          <ul>
            <li>Use your email and password to log in.</li>
            <li>Create a new account with a valid email address.</li>
            <li>Reset your password if you can’t sign in.</li>
          </ul>
        </>
      ) };

    return { title: "Storage Inventory", content: (
      <>
        <p>Get around and manage your storage quickly.</p>
        <ul>
          <li>Use the menu in the top-right to navigate to key pages.</li>
          <li>Search to jump directly to a box or item.</li>
          <li>Use labels and scan to connect physical storage to the app.</li>
        </ul>
      </>
    ) };
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label="Help"
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
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 17v.01" />
          <path d="M12 13a2 2 0 1 0-2-2" />
        </svg>
      </button>

      <Modal open={open} title={`Help — ${meta.title}`} onClose={() => setOpen(false)} anchor="top-right">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 14 }}>{meta.content}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setOpen(false)} className="tap-btn">Close</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
