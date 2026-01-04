"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildAdminHeaders,
  clearAdminPassword,
  getStoredAdminPassword,
  storeAdminPassword,
} from "@/lib/admin-auth-client";

type AdminAuthContextValue = {
  fetchWithAdmin: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export const useAdminFetch = () => {
  const context = useContext(AdminAuthContext);
  return context?.fetchWithAdmin ?? fetch;
};

export default function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const resolverRef = useRef<((value: string | null) => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const requestPassword = useCallback((message?: string) => {
    setPassword("");
    setError(message ?? null);
    setOpen(true);
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const closePrompt = (value: string | null) => {
    setOpen(false);
    setPassword("");
    setError(null);
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
  };

  const handleSubmit = () => {
    const trimmed = password.trim();
    if (!trimmed) {
      setError("请输入管理员密码");
      return;
    }
    closePrompt(trimmed);
  };

  const fetchWithAdmin = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const attempt = async (value?: string) =>
        fetch(input, {
          ...init,
          headers: buildAdminHeaders(init?.headers, value),
        });

      const stored = getStoredAdminPassword();
      if (stored) {
        const response = await attempt(stored);
        if (response.status !== 401 && response.status !== 403) {
          return response;
        }
        clearAdminPassword();
      }

      const initial = await attempt();
      if (initial.status !== 401 && initial.status !== 403) {
        return initial;
      }

      let lastResponse = initial;
      let message = "需要管理员密码";
      for (let i = 0; i < 3; i += 1) {
        const entered = await requestPassword(message);
        if (!entered) {
          return lastResponse;
        }
        const response = await attempt(entered);
        lastResponse = response;
        if (response.status !== 401 && response.status !== 403) {
          storeAdminPassword(entered);
          return response;
        }
        clearAdminPassword();
        message = "密码错误，请重试";
      }

      return lastResponse;
    },
    [requestPassword]
  );

  const contextValue = useMemo(() => ({ fetchWithAdmin }), [fetchWithAdmin]);

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#d4cfc5] bg-[#fdfcf9] p-5 shadow-lg">
            <div className="font-[var(--font-terminal)] text-sm text-[#1a1915]">
              ADMIN_AUTH
            </div>
            <p className="mt-2 text-xs text-[#6b6560] font-[var(--font-mono)]">
              请输入管理员密码以继续操作。
            </p>
            <div className="mt-4 space-y-2">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="admin password"
                className="term-input w-full font-[var(--font-mono)] text-sm"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              {error ? (
                <div className="text-[10px] text-[#c53030] font-[var(--font-mono)]">
                  {error}
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSubmit}
                className="term-btn flex-1 glitch-hover"
              >
                <span>{"[>] CONFIRM"}</span>
              </button>
              <button
                onClick={() => closePrompt(null)}
                className="term-btn flex-1 border-[#6b6560] text-[#6b6560] hover:text-white hover:bg-[#6b6560]"
              >
                <span>{"[x] CANCEL"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminAuthContext.Provider>
  );
}
