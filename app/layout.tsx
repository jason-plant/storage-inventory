import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Storage Inventory",
  description: "Box + item inventory",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
        {/* Top Nav */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "#fff",
            borderBottom: "1px solid #ddd",
          }}
        >
          <div
            style={{
              maxWidth: 1000,
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
                fontWeight: 800,
                textDecoration: "none",
                color: "#000",
              }}
            >
              Storage Inventory
            </a>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="/boxes" style={linkStyle}>
                Boxes
              </a>
              <a href="/search" style={linkStyle}>
                Search
              </a>
              <a href="/labels" style={linkStyle}>
                Labels
              </a>
            </div>
          </div>
        </nav>

        {/* Page content */}
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px" }}>
          {children}
        </div>
      </body>
    </html>
  );
}

const linkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#000",
  border: "1px solid #444",
  padding: "8px 10px",
  borderRadius: 8,
};
