// NeoDB API Configuration

export interface NeoDBConfig {
  token: string;
}

const CONFIG_KEY = "enjoyrecord_neodb_config";

const DEFAULT_CONFIG: NeoDBConfig = {
  token: "",
};

export const getNeoDBConfig = (): NeoDBConfig => {
  if (typeof window === "undefined") {
    return DEFAULT_CONFIG;
  }
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_CONFIG;
};

export const saveNeoDBConfig = (config: NeoDBConfig) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save NeoDB config:", e);
  }
};

export const getNeoDBToken = (): string => {
  const config = getNeoDBConfig();
  return config.token || "";
};
