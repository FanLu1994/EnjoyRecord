"use client";

const STORAGE_KEY = "enjoyrecord_admin_auth";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

type StoredAuth = {
  password: string;
  expiresAt: number;
};

const now = () => Date.now();

export const getStoredAdminPassword = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.password || !parsed.expiresAt) return null;
    if (parsed.expiresAt <= now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.password;
  } catch {
    return null;
  }
};

export const storeAdminPassword = (password: string) => {
  if (typeof window === "undefined") return;
  const payload: StoredAuth = {
    password,
    expiresAt: now() + TTL_MS,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const clearAdminPassword = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const buildAdminHeaders = (init?: HeadersInit, password?: string) => {
  const headers = new Headers(init ?? {});
  if (password) {
    headers.set("x-admin-password", password);
  }
  return headers;
};

export interface AdminFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<any>;
}

export function createAdminFetchResponse(
  status: number,
  data: any
): AdminFetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  };
}
