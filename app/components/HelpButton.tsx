"use client";

import React, { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Modal from "./Modal";

export default function HelpButton() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  const meta = useMemo(() => {
    if (pathname === "/" || pathname === "/locations")
      return { title: "Buildings", content: (
        <>
          <p>Start here to organize where your rooms live.</p>
          <ul>
            <li>Tap <strong>New</strong> to add a building (e.g., Warehouse, Office).</li>
            <li>Use the edit/delete icons on a building card to rename or remove it.</li>
            <li>Select a building card to view and manage its rooms.</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/projects"))
      return { title: "Projects", content: (
        <>
          <p>Projects group your buildings into larger areas.</p>
          <ul>
            <li>Create a project first, then add buildings under it.</li>
            <li>Rename projects any time.</li>
            <li>Delete a project only after removing or moving its buildings.</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/locations/"))
      return { title: "Building", content: (
        <>
          <p>Manage all rooms stored in this building.</p>
          <ul>
            <li>Tap <strong>New</strong> to create a room in this building.</li>
            <li>Use edit/delete icons on a room card to rename or remove it.</li>
            <li>Select a room card to open it and manage its FFE.</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/boxes"))
      return { title: "Rooms", content: (
        <>
          <p>Browse and manage all rooms across buildings.</p>
          <ul>
            <li>Tap a room to open it and see FFE inside.</li>
            <li>Use the edit/delete icons on a room card to update details.</li>
            <li>Tap <strong>New</strong> to create a room and assign a building.</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/box/"))
      return { title: "Room", content: (
        <>
          <p>Manage FFE stored in this room.</p>
          <ul>
            <li>Tap an item to edit its name, quantity, description, or photo.</li>
            <li>Use the + button to add new FFE to this room.</li>
            <li>Use Edit/Delete on FFE, or edit the room details as needed.</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/labels"))
      return { title: "Labels", content: (
        <>
          <p>Create, print, or share QR labels for your rooms.</p>
          <ul>
            <li>Long-press a label to select multiple rooms.</li>
            <li>Pick a layout (Default, 40×30 mm, 50×80 mm) and number of copies.</li>
            <li>Print, export PDF, share images, or try Bluetooth printing (device support varies).</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/scan-item") || pathname.startsWith("/scan"))
      return { title: "Scan", content: (
        <>
          <p>Scan a barcode or QR code to jump to a room or FFE.</p>
          <ul>
            <li>Allow camera access when prompted.</li>
            <li>Hold the code steady in the frame for quick detection.</li>
            <li>Results open the matching room or FFE automatically.</li>
          </ul>
        </>
      ) };

    if (pathname.startsWith("/search"))
      return { title: "Search", content: (
        <>
          <p>Find rooms or FFE quickly across your inventory.</p>
          <ul>
            <li>Type a room code, room name, building, or FFE name to search.</li>
            <li>Select a result to open the room or FFE details.</li>
            <li>Use edit actions from results to update FFE fast.</li>
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
          <li>Search to jump directly to a room or FFE.</li>
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
