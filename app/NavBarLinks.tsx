"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "./lib/auth";
import { supabase } from "./lib/supabaseClient";

function linkBase(active: boolean): React.CSSProperties {
  return {
    textDecoration: "none",
    color: active ? "#fff" : "#111",
    border: active ? "1px solid #111" : "1px solid #ddd",
    padding: "10px 12px",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 800,
    background: active ? "#111" : "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    userSelect: "none",
  };
}

function btnBase(): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "10px 12px",
    fontSize: 14,
    fontWeight: 900,
    background: "#fff",
    border: "1px solid #ddd",
    color: "#111",
    cursor: "pointer",
  };
}

export default function NavBarLinks() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  // While auth is loading, don’t “hide” everything (prevents flicker)
  // We’ll show logged-out links until we know.
  const authed = !loading && !!user;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {authed ? (
        <>
          <a href="/locations" style={linkBase(isActive("/locations"))}>
            Locations
          </a>
          <a href="/boxes" style={linkBase(isActive("/boxes"))}>
            Boxes
          </a>
          <a href="/search" style={linkBase(isActive("/search"))}>
            Search
          </a>
          <a href="/labels" style={linkBase(isActive("/labels"))}>
            Labels
          </a>
          <a href="/scan" style={linkBase(isActive("/scan"))}>
            Scan QR
          </a>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            style={{
              ...btnBase(),
              border: "1px solid #ef4444",
              color: "#ef4444",
              background: "#fff",
            }}
          >
            Log out
          </button>
        </>
      ) : (
        <>
          <a href="/login" style={linkBase(isActive("/login"))}>
            Log in
          </a>
          <a href="/signup" style={linkBase(isActive("/signup"))}>
            Sign up
          </a>
        </>
      )}
    </div>
  );
}
