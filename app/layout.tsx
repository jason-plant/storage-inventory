import type { Metadata } from "next";
import React from "react";
import NavBarLinks from "./NavBarLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: "Storage Inventory",
  description: "Box and item inventory system",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
          background: "#f6f6f7",
          color: "#111",
        }}
      >
        {/* NAV lives in a Client Component */}
        <NavBarLinks />

        {/* CONTENT */}
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "14px 14px 28px",
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
