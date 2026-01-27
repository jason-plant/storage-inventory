"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./lib/auth";

export default function NavBarLinks() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup";

  return (
    <nav style={{ display: "flex", gap: 10, alignItems: "center" }}>
      {user && (
        <>
          <Link className="nav-btn" href="/locations">Locations</Link>
          <Link className="nav-btn" href="/boxes">Boxes</Link>
          <Link className="nav-btn" href="/search">Search</Link>
          <Link className="nav-btn" href="/scan">Scan QR</Link>

          <button
            className="nav-btn"
            onClick={signOut}
          >
            Log out
          </button>
        </>
      )}

      {!user && !isAuthPage && (
        <>
          <Link className="nav-btn" href="/login">Log in</Link>
          <Link className="nav-btn" href="/signup">Sign up</Link>
        </>
      )}
    </nav>
  );
}
