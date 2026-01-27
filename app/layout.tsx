import type { Metadata } from "next";
import React from "react";
import NavBarLinks from "./NavBarLinks";

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
          background: "#f6f7fb",
          color: "#111",
        }}
      >
        {/* GLOBAL “APP” FEEL */}
        <style>{`
          :root{
            --card:#ffffff;
            --border:#e5e7eb;
            --shadow: 0 1px 10px rgba(0,0,0,0.06);
            --radius: 18px;
          }

          html, body { margin: 0; padding: 0; background: #f6f7fb; color:#111; }

          input, select, button, textarea {
            font-size: 16px; /* stops iOS zoom */
            border-radius: 14px;
            border: 1px solid var(--border);
            padding: 12px 12px;
            box-sizing: border-box;
            background: #fff;
            color: #111;
          }

          button {
            font-weight: 900;
            cursor: pointer;
          }

          button:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          /* Simple “tap” animation */
          .tap-btn:active {
            transform: scale(0.98);
          }

          a { -webkit-tap-highlight-color: transparent; }

          @media (max-width: 600px) {
            .nav-wrap { flex-direction: column; align-items: flex-start; }
            .nav-links { width: 100%; }
          }
        `}</style>

        {/* NAV BAR */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "rgba(246,247,251,0.92)",
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
              className="tap-btn"
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
              <NavBarLinks />
            </div>
          </div>
        </nav>

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
