"use client";

import { useState, useEffect } from "react";
import { getNeoDBConfig, saveNeoDBConfig, type NeoDBConfig } from "@/lib/neodb-config";
import { useAdminFetch } from "@/components/admin-auth-provider";

export default function SettingsPage() {
  const [config, setConfig] = useState<NeoDBConfig>(getNeoDBConfig());
  const [token, setToken] = useState(config.token || "");
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ imported: number; skipped: number } | null>(null);
  const adminFetch = useAdminFetch();

  useEffect(() => {
    const currentConfig = getNeoDBConfig();
    setConfig(currentConfig);
    setToken(currentConfig.token || "");
  }, []);

  const runSync = async (neoToken: string) => {
    setSyncError(null);
    setSyncResult(null);
    if (!neoToken) return;

    setSyncing(true);
    try {
      const response = await adminFetch("/api/neodb/import", {
        method: "POST",
        headers: {
          "x-neodb-token": neoToken,
        },
      });
      const data = (await response.json()) as {
        imported?: number;
        skipped?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data?.error || "NeoDB 同步失败");
      }
      setSyncResult({
        imported: data.imported ?? 0,
        skipped: data.skipped ?? 0,
      });
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "NeoDB 同步失败");
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    const trimmedToken = token.trim();
    try {
      const verify = await adminFetch("/api/admin/verify", { method: "POST" });
      const data = await verify.json().catch(() => ({}));
      if (!verify.ok) {
        throw new Error(data.error || "需要管理员密码");
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "需要管理员密码");
      return;
    }

    const newConfig: NeoDBConfig = {
      token: trimmedToken,
    };
    saveNeoDBConfig(newConfig);
    setConfig(newConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    if (!trimmedToken) return;
    await runSync(trimmedToken);
  };

  return (
    <div className="stagger-in">
      {/* Terminal Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-[var(--font-terminal)] text-[#00a86b] text-sm">./settings</span>
          <span className="text-[#d4cfc5]">→</span>
          <span className="text-[#9a958f] text-sm">configuration</span>
        </div>
        <p className="text-[#9a958f] text-sm font-[var(--font-mono)]">
          neo_api_token={token ? "***" : "null"}<span className="term-cursor" />
        </p>
      </header>

      <div className="space-y-4">
        {/* NeoDB Configuration */}
        <div className="term-card">
          <h2 className="font-[var(--font-terminal)] text-[#1a1915] text-sm mb-4 flex items-center gap-2">
            <span className="text-[#00a86b]">&gt;</span>
            NEODB_API_CONFIG
          </h2>

          <div className="space-y-4">
            {/* Token Input */}
            <div>
              <label className="block text-xs text-[#6b6560] mb-2 font-[var(--font-mono)]">
                $ export NEODB_TOKEN=
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onCopy={(e) => e.preventDefault()}
                placeholder="your_token_here"
                className="term-input font-[var(--font-mono)] text-sm"
              />
              <p className="text-[10px] text-[#9a958f] mt-2 font-[var(--font-mono)]">
                # Get token: neodb.social → Settings → Authorized Apps → Generate Token (Full Access)
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="term-btn w-full glitch-hover"
            >
              <span>{syncing ? "[~] SYNCING_NEODB" : saved ? "[✓] SAVED" : "[>] SAVE_CONFIG"}</span>
            </button>
            <button
              onClick={() => runSync(token.trim())}
              disabled={!token.trim() || syncing}
              className="term-btn w-full glitch-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{syncing ? "[~] SYNCING_NEODB" : "[>] SYNC_NEODB_NOW"}</span>
            </button>
            {syncError ? (
              <p className="text-[10px] text-[#d48806] font-[var(--font-mono)]">
                ! {syncError}
              </p>
            ) : syncResult ? (
              <p className="text-[10px] text-[#00a86b] font-[var(--font-mono)]">
                + imported {syncResult.imported}, skipped {syncResult.skipped}
              </p>
            ) : null}
          </div>
        </div>

        {/* System Info */}
        <div className="term-card">
          <h2 className="font-[var(--font-terminal)] text-[#1a1915] text-sm mb-4 flex items-center gap-2">
            <span className="text-[#00a86b]">&gt;</span>
            SYSTEM_INFO
          </h2>

          <div className="space-y-2 text-xs font-[var(--font-mono)]">
            <div className="flex justify-between">
              <span className="text-[#6b6560]">data_source:</span>
              <span className="text-[#1a1915]">"neodb.social"</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b6560]">api_status:</span>
              <span className="text-[#00a86b]">"ONLINE"</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b6560]">auth_status:</span>
              <span className={token ? "text-[#00a86b]" : "text-[#d48806]"}>
                {token ? "\"CONFIGURED\"" : "\"NOT_SET\""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b6560]">sync_enabled:</span>
              <span className={token ? "text-[#00a86b]" : "text-[#9a958f]"}>
                {token ? "\"TRUE\"" : "\"FALSE\""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b6560]">local_storage:</span>
              <span className="text-[#1a1915]">"ENABLED"</span>
            </div>
          </div>
        </div>

        {/* Sync Info */}
        <div className="term-card">
          <h2 className="font-[var(--font-terminal)] text-[#1a1915] text-sm mb-4 flex items-center gap-2">
            <span className="text-[#00a86b]">&gt;</span>
            SYNC_INFO
          </h2>

          <div className="text-xs text-[#6b6560] space-y-3 font-[var(--font-mono)]">
            <p>
              <span className="text-[#1a1915]">EnjoyRecord</span> 会自动将记录同步到您的 NeoDB 账户。
            </p>
            <div className="space-y-1 pl-4 border-l-2 border-[#d4cfc5]">
              <p>• 搜索: 从 NeoDB 公开目录获取</p>
              <p>• 保存: 本地存储 + 同步到 NeoDB</p>
              <p>• 状态: 自动映射 (planned→wishlist, completed→complete)</p>
              <p>• 评分: 同步到 NeoDB</p>
            </div>
            <p className="text-[#d48806]">
              ! Token 需要 Full Access 权限才能同步数据
            </p>
          </div>
        </div>

        {/* About */}
        <div className="term-card">
          <h2 className="font-[var(--font-terminal)] text-[#1a1915] text-sm mb-4 flex items-center gap-2">
            <span className="text-[#00a86b]">&gt;</span>
            ABOUT
          </h2>

          <div className="text-xs text-[#6b6560] space-y-2 font-[var(--font-mono)]">
            <p>
              <span className="text-[#1a1915]">EnjoyRecord</span> is a personal
              tracking system for reading and viewing history.
            </p>
            <p>
              Powered by <span className="text-[#00a86b]">NeoDB</span> API.
              Records synced to your NeoDB account.
            </p>
            <div className="pt-2 border-t border-[#d4cfc5]">
              <span>version: 0.2.0-terminal</span>
              <span className="mx-2">|</span>
              <span>build: 2025.01</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-[#d4cfc5]">
        <div className="flex items-center justify-between text-xs text-[#9a958f] font-[var(--font-mono)]">
          <span>config: loaded</span>
          <span>ready</span>
        </div>
      </footer>
    </div>
  );
}
