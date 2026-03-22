import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Settings = {
  darkMode: boolean;
  voiceInput: boolean;
  speechSpeed: number;
  captions: boolean;
  textSize: number;
  highContrast: boolean;
  assignmentReminders: boolean;
  calendarAlerts: boolean;
  weeklyDigest: boolean;
};

type SettingsContextType = {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
  clearAllData: () => void;
};

const defaultSettings: Settings = {
  darkMode: false,
  voiceInput: true,
  speechSpeed: 1,
  captions: false,
  textSize: 16,
  highContrast: false,
  assignmentReminders: true,
  calendarAlerts: true,
  weeklyDigest: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = "unisync_settings";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
    document.documentElement.classList.toggle("high-contrast", settings.highContrast);
    document.documentElement.style.fontSize = `${settings.textSize}px`;
  }, [settings.darkMode, settings.highContrast, settings.textSize]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const clearAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem("unisync_conversations");
    setSettings(defaultSettings);
  };

  const value = useMemo(
    () => ({ settings, updateSetting, resetSettings, clearAllData }),
    [settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return context;
}