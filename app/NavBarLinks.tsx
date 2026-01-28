"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./lib/auth";

export default function NavBarLinks() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const authedLinks = useMemo(
    () => [
      { href: "/locations", label: "Locations" },
      { href: "/boxes", label: "Boxes" },
      { href: "/search", label: "Search" },
      { href: "/labels", label: "Labels" },
      { href: "/scan", label: "Scan QR" },
    ],
    []
  );

  return (
    <>
      {/* Desktop nav */}
      <nav
        className="nav-desktop"
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {user ? (
          <>
            {authedLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`nav-btn ${isActive(l.href) ? "active" : ""}`}
              >
                {l.label}
              </Link>
            ))}

            <button className="nav-btn" onClick={signOut}>
              Log out
            </button>
          </>
        ) : (
          !isAuthPage && (
            <>
              <Link className="nav-btn" href="/login">
                Log in
              </Link>
              <Link className="nav-btn" href="/signup">
                Sign up
              </Link>
            </>
          )
        )}
      </nav>

      {/* Mobile burger pinned to top-right */}
      {!isAuthPage && (
        <div
          className="nav-mobile"
          style={{
            position: "fixed",
            top: "max(10px, env(safe-area-inset-top))",
            right: "max(10px, env(safe-area-inset-right))",
            zIndex: 5000,
          }}
        >
          <button
            type="button"
            className="nav-btn"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              width: 46,
              height: 46,
              padding: 0,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
              background: "#fff",
            }}
          >
            {menuOpen ? (
              <span style={{ fontWeight: 900, fontSize: 18, lineHeight: 1 }}>
                ✕
              </span>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>

          {/* Backdrop */}
          {menuOpen && (
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.35)",
                border: "none",
                padding: 0,
                margin: 0,
                zIndex: 4999,
              }}
            />
          )}

          {/* Dropdown - opens inward from top-right */}
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: 54,
                right: 0,
                zIndex: 5001,
                width: "min(280px, calc(100vw - 24px))",
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: 10, display: "grid", gap: 8 }}>
                {user ? (
                  <>
                    {authedLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={`nav-btn ${isActive(l.href) ? "active" : ""}`}
                        onClick={() => setMenuOpen(false)}
                        style={{
                          width: "100%",
                          justifyContent: "flex-start",
                        }}
                      >
                        {l.label}
                      </Link>
                    ))}

                    <button
                      className="nav-btn"
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      style={{
                        width: "100%",
                        justifyContent: "flex-start",
                      }}
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      className="nav-btn"
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      style={{ width: "100%", justifyContent: "flex-start" }}
                    >
                      Log in
                    </Link>
                    <Link
                      className="nav-btn"
                      href="/signup"
                      onClick={() => setMenuOpen(false)}
                      style={{ width: "100%", justifyContent: "flex-start" }}
                    >
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Responsive rules */}
      <style jsx>{`
        .nav-desktop {
          display: flex;
        }
        .nav-mobile {
          display: none;
        }

        @media (max-width: 740px) {
          .nav-desktop {
            display: none !important;
          }
          .nav-mobile {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
