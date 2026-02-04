"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppIcon } from "./Icons";

type Meta = { title: string; iconKey: string; href: string };


type HeaderTitleProps = {
  hideIcon?: boolean;
  iconOnly?: boolean;
};

export default function HeaderTitle({ hideIcon = false, iconOnly = false }: HeaderTitleProps = {}) {
  const pathname = usePathname() || "/";

  const [activeProjectName, setActiveProjectName] = useState<string>("");
  const [activeBuildingName, setActiveBuildingName] = useState<string>("");
  const [activeRoomName, setActiveRoomName] = useState<string>("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const readProject = () => setActiveProjectName(localStorage.getItem("activeProjectName") || "");
    readProject();
    window.addEventListener("storage", readProject);
    window.addEventListener("active-project-changed", readProject as EventListener);
    return () => {
      window.removeEventListener("storage", readProject);
      window.removeEventListener("active-project-changed", readProject as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const readBuilding = () => setActiveBuildingName(localStorage.getItem("activeBuildingName") || "");
    readBuilding();
    window.addEventListener("storage", readBuilding);
    window.addEventListener("active-building-changed", readBuilding as EventListener);
    return () => {
      window.removeEventListener("storage", readBuilding);
      window.removeEventListener("active-building-changed", readBuilding as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const readRoom = () => setActiveRoomName(localStorage.getItem("activeRoomName") || "");
    readRoom();
    window.addEventListener("storage", readRoom);
    window.addEventListener("active-room-changed", readRoom as EventListener);
    return () => {
      window.removeEventListener("storage", readRoom);
      window.removeEventListener("active-room-changed", readRoom as EventListener);
    };
  }, []);

  const nextMeta = useMemo<Meta>(() => {
    let section = '';
    let iconKey = 'home';
    let href = "/projects";
    if (pathname === "/" || pathname === "/projects") { section = 'Projects'; iconKey = 'projects'; href = "/projects"; }
    else if (pathname === "/locations") { section = 'Buildings'; iconKey = 'locations'; href = "/locations"; }
    else if (pathname.startsWith("/locations/")) { section = activeBuildingName || 'Building'; iconKey = 'locations'; href = "/locations"; }
    else if (pathname.startsWith("/boxes")) { section = 'Rooms'; iconKey = 'boxes'; href = "/boxes"; }
    else if (pathname.startsWith("/search")) { section = 'Search'; iconKey = 'search'; href = "/search"; }
    else if (pathname.startsWith("/labels")) { section = 'Labels'; iconKey = 'labels'; href = "/labels"; }
    else if (pathname.startsWith("/scan-item")) { section = 'Scan FFE'; iconKey = 'scanItem'; href = "/scan-item"; }
    else if (pathname.startsWith("/scan")) { section = 'Scan QR'; iconKey = 'scanQR'; href = "/scan"; }
    else if (pathname.startsWith("/box/")) {
      section = activeRoomName || 'Room';
      iconKey = 'boxes';
      const parts = pathname.split("/").filter(Boolean);
      const code = parts[1] ? decodeURIComponent(parts[1]) : "";
      href = code ? `/box/${encodeURIComponent(code)}` : "/boxes";
    }
    const main = activeProjectName?.trim() || "Projects";
    const title = section ? `${main}\n${section}` : main;
    return { title, iconKey, href };
  }, [pathname, activeProjectName, activeBuildingName, activeRoomName]);

  const [prevMeta, setPrevMeta] = useState<Meta | null>(null);
  const [meta, setMeta] = useState<Meta>(nextMeta);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (nextMeta.title === meta.title) return;
    setPrevMeta(meta);
    setAnimating(true);

    // start entering new meta after a tiny delay so CSS can animate both layers
    requestAnimationFrame(() => setMeta(nextMeta));

    // finish animation after 260ms and clear prev
    const t = setTimeout(() => {
      setPrevMeta(null);
      setAnimating(false);
    }, 260);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextMeta]);

  const Icon = useAppIcon(meta.iconKey as any);

  if (iconOnly) {
    return (
      <div style={{ width: 36, height: 36, flex: "0 0 auto", position: "relative" }}>
        <div
          className={`ht-layer ${animating ? "entering" : ""}`}
          style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-hidden={!!prevMeta}
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
              color: "#111",
            }}
          >
            {Icon}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link href={meta.href} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 10, minWidth: 0, width: '100%' }}>
      {!hideIcon && (
        <div style={{ width: 36, height: 36, flex: "0 0 auto", position: "relative" }}>
          <div
            className={`ht-layer ${animating ? "entering" : ""}`}
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-hidden={!!prevMeta}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.35)",
                boxShadow: "0 1px 6px rgba(0,0,0,0.2)",
                color: "#fff",
              }}
            >
              {Icon}
            </div>
          </div>
        </div>
      )}
      <div style={{ position: "relative", minWidth: 80, height: 36, flex: 1, overflow: 'hidden' }}>
        {prevMeta && (
          <div className={`ht-layer exiting`} style={{ position: "absolute", left: 0, top: 0, right: 0 }}>
            <span style={{ fontWeight: 900, fontSize: 18, display: "inline-block", lineHeight: 1.9 }}>{prevMeta.title}</span>
          </div>
        )}
        <div
          className={`ht-layer ${animating ? "entering" : ""}`}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            minWidth: 80,
            maxWidth: 320,
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            lineHeight: 1.1,
            marginLeft: hideIcon ? 0 : 10,
            overflow: 'hidden',
          }}
        >
          {(() => {
            const [main, section] = meta.title.split('\n');
            // Split main into name and 'Inventory'
            let name = main;
            let inventory = '';
            const invIdx = main.indexOf("'s Inventory");
            if (invIdx !== -1) {
              name = main.slice(0, invIdx);
              inventory = main.slice(invIdx);
            }
            return (
              <>
                <div style={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  whiteSpace: 'nowrap',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 320,
                }}>
                  <span style={{ fontWeight: 700, fontSize: 17, textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 180, display: 'inline-block' }}>{name}</span>
                  <span style={{ fontWeight: 700, fontSize: 17, textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 120, display: 'inline-block' }}>{inventory}</span>
                </div>
                {section && (
                  <div style={{ fontWeight: 900, fontSize: 16, marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 320, whiteSpace: 'nowrap' }}>{section}</div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </Link>
  );
}
