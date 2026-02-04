"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

// List of icon keys used throughout the app
export type IconKey =
  | "projects"
  | "locations"
  | "boxes"
  | "search"
  | "labels"
  | "scanQR"
  | "scanItem"
  | "home"
  | "edit"
  | "delete"
  | "logout";

export type IconStyle = "svg" | "emoji";

export type IconSettings = {
  [K in IconKey]?: IconStyle;
};

const DEFAULT_ICON_SETTINGS: IconSettings = {
  projects: "svg",
  locations: "svg",
  boxes: "svg",
  search: "svg",
  labels: "svg",
  scanQR: "svg",
  scanItem: "svg",
  home: "svg",
  edit: "svg",
  delete: "svg",
  logout: "emoji",
};

export const IconSettingsContext = createContext<{
  iconSettings: IconSettings;
  setIconSettings: (settings: IconSettings) => void;
  setIconStyle: (key: IconKey, style: IconStyle) => void;
} | null>(null);

export function IconSettingsProvider({ children }: { children: React.ReactNode }) {
  const [iconSettings, setIconSettingsState] = useState<IconSettings>(DEFAULT_ICON_SETTINGS);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("iconSettings");
      if (raw) {
        try {
          setIconSettingsState({ ...DEFAULT_ICON_SETTINGS, ...JSON.parse(raw) });
        } catch {}
      }
    }
  }, []);

  const setIconSettings = (settings: IconSettings) => {
    setIconSettingsState(settings);
    if (typeof window !== "undefined") {
      localStorage.setItem("iconSettings", JSON.stringify(settings));
    }
  };

  const setIconStyle = (key: IconKey, style: IconStyle) => {
    setIconSettings({ ...iconSettings, [key]: style });
  };

  return (
    <IconSettingsContext.Provider value={{ iconSettings, setIconSettings, setIconStyle }}>
      {children}
    </IconSettingsContext.Provider>
  );
}

export function useIconSettings() {
  const ctx = useContext(IconSettingsContext);
  if (!ctx) throw new Error("useIconSettings must be used within IconSettingsProvider");
  return ctx;
}
