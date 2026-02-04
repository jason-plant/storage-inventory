"use client";

import React from "react";

export const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

// SVG versions
export const IconLocationsSVG = () => (
  <Icon>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 21V7h10v14" />
    <path d="M9 9h2M13 9h2M9 12h2M13 12h2M9 15h2M13 15h2" />
  </Icon>
);
export const IconBoxesSVG = () => (
  <Icon>
    <path d="M7 21V3h10v18" />
    <path d="M7 3h10" />
    <circle cx="14" cy="12" r="1" />
  </Icon>
);
export const IconProjectsSVG = () => (
  <Icon>
    <path d="M3 7h7l2 2h9v8a2 2 0 0 1-2 2H3z" />
    <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2" />
  </Icon>
);
export const IconSearchSVG = () => (
  <Icon>
    <circle cx="11" cy="11" r="6" />
    <path d="M21 21l-4.35-4.35" />
  </Icon>
);
export const IconLabelsSVG = () => (
  <Icon>
    <path d="M3 7v6a2 2 0 001 1.73L12 20l7-4.27A2 2 0 0020 14V8a2 2 0 00-1-1.73L12 2 4 6.27A2 2 0 003 7z" />
    <circle cx="8.5" cy="10.5" r="1.5" />
  </Icon>
);
export const IconScanQRSVG = () => (
  <Icon>
    <rect x="3" y="3" width="5" height="5" />
    <rect x="16" y="3" width="5" height="5" />
    <rect x="3" y="16" width="5" height="5" />
    <path d="M14 14h2v2h-2z" />
  </Icon>
);
export const IconScanItemSVG = () => (
  <Icon>
    <path d="M12 2v20" />
    <path d="M2 12h20" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);
export const IconHomeSVG = () => (
  <Icon>
    <path d="M3 11l9-7 9 7" />
    <path d="M9 22V12h6v10" />
  </Icon>
);

// Emoji versions
export const IconLocationsEmoji = () => <span role="img" aria-label="Buildings">🏢</span>;
export const IconBoxesEmoji = () => <span role="img" aria-label="Rooms">🚪</span>;
export const IconProjectsEmoji = () => <span role="img" aria-label="Projects">🗂️</span>;
export const IconSearchEmoji = () => <span role="img" aria-label="Search">🔍</span>;
export const IconLabelsEmoji = () => <span role="img" aria-label="Labels">🏷️</span>;
export const IconScanQREmoji = () => <span role="img" aria-label="Scan QR">� QR</span>;
export const IconScanItemEmoji = () => <span role="img" aria-label="Scan Item">🧾</span>;
export const IconHomeEmoji = () => <span role="img" aria-label="Home">🏠</span>;

// Utility to select icon version
import { useIconSettings } from "../lib/iconSettings";
import type { IconKey } from "../lib/iconSettings";

const iconMap: Record<IconKey, { svg: React.ComponentType; emoji: React.ComponentType }> = {
  projects: { svg: IconProjectsSVG, emoji: IconProjectsEmoji },
  locations: { svg: IconLocationsSVG, emoji: IconLocationsEmoji },
  boxes: { svg: IconBoxesSVG, emoji: IconBoxesEmoji },
  search: { svg: IconSearchSVG, emoji: IconSearchEmoji },
  labels: { svg: IconLabelsSVG, emoji: IconLabelsEmoji },
  scanQR: { svg: IconScanQRSVG, emoji: IconScanQREmoji },
  scanItem: { svg: IconScanItemSVG, emoji: IconScanItemEmoji },
  home: { svg: IconHomeSVG, emoji: IconHomeEmoji },
  edit: { svg: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
  ), emoji: () => <span role="img" aria-label="Edit">✏️</span> },
  delete: { svg: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
  ), emoji: () => <span role="img" aria-label="Delete">🗑️</span> },
  logout: { svg: () => <span>🚪</span>, emoji: () => <span>🚪</span> },
};

export function useAppIcon(key: IconKey) {
  const { iconSettings } = useIconSettings();
  const style = iconSettings[key] || "svg";
  const Comp = iconMap[key][style];
  return <Comp />;
}
