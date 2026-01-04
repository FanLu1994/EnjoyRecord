"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminAuthProvider from "@/components/admin-auth-provider";

const NAV_ITEMS = [
  { href: "/", label: "HOME", icon: ">_", sublabel: "首页" },
  { href: "/library", label: "LIB", icon: "[]", sublabel: "库" },
  { href: "/stats", label: "STAT", icon: "%", sublabel: "统计" },
  { href: "/new", label: "NEW", icon: "+", sublabel: "添加" },
  { href: "/settings", label: "SET", icon: ":", sublabel: "设置" },
] as const;

export default function TerminalSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCompact, setIsCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navContent = useMemo(() => (
    <nav className="w-48 transition-opacity duration-200 ease-out opacity-100">
      {/* Logo/Brand */}
      <div className="px-4 pb-4 border-b border-[#d4cfc5] mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-[#00a86b] text-white shrink-0">
            <span className="font-[var(--font-terminal)] text-lg font-bold">ER</span>
          </div>
          <div className="min-w-0">
            <div className="font-[var(--font-terminal)] text-sm text-[#00a86b] tracking-wider truncate">
              ENJOYRECORD
            </div>
            <div className="text-[10px] text-[#6b6560]">v0.2.0</div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 text-sm transition-all duration-150 ${
                isActive
                  ? "bg-[#00a86b]/10 text-[#00a86b]"
                  : "text-[#6b6560] hover:text-[#1a1915] hover:bg-[#d4cfc5]/50"
              }`}
            >
              <span className="font-[var(--font-terminal)] text-base w-4 shrink-0">
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-[var(--font-terminal)] text-xs tracking-wider">
                  {item.label}
                </div>
                <div className="text-[10px] text-[#9a958f] truncate">{item.sublabel}</div>
              </div>
              {isActive && (
                <span className="h-1.5 w-1.5 bg-[#00a86b] rounded-sm animate-pulse shrink-0" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Status Indicator */}
      <div className="mt-4 px-4">
        <div className="text-[10px] text-[#9a958f] font-[var(--font-terminal)]">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-[#00a86b] rounded-full animate-pulse" />
            <span>ONLINE</span>
          </div>
        </div>
      </div>
    </nav>
  ), [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const parseSize = (value: string) => {
      const trimmed = value.trim();
      if (trimmed.endsWith("rem")) {
        const rootSize = Number.parseFloat(
          getComputedStyle(document.documentElement).fontSize
        );
        return Number.parseFloat(trimmed) * rootSize;
      }
      if (trimmed.endsWith("px")) {
        return Number.parseFloat(trimmed);
      }
      const numeric = Number.parseFloat(trimmed);
      return Number.isNaN(numeric) ? 0 : numeric;
    };

    const updateLayout = () => {
      const styles = getComputedStyle(document.documentElement);
      const maxWidth = parseSize(styles.getPropertyValue("--page-max-width")) || 800;
      const padding = parseSize(styles.getPropertyValue("--content-padding")) || 32;
      const sidebarWidth = 192;
      const sidebarGutter = 16;
      const requiredWidth = maxWidth + padding * 2 + sidebarWidth + sidebarGutter;
      const compact = window.innerWidth < requiredWidth;
      setIsCompact(compact);
      if (!compact) {
        setMenuOpen(false);
      }
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      {/* Container for sidebar + content */}
      <div className="relative max-w-[var(--page-max-width)] mx-auto px-[var(--content-padding)]">
        {/* Sidebar - fixed to viewport center, aligned to content left */}
        {!isCompact ? (
          <div
            className="fixed top-1/2 -translate-y-1/2 -translate-x-full z-10"
            style={{
              left:
                "max(var(--content-padding), calc((100vw - var(--page-max-width)) / 2 + var(--content-padding)))",
              marginLeft: "-1rem",
            }}
          >
            {navContent}
          </div>
        ) : null}

        {/* Floating Menu for Compact Layout */}
        {isCompact ? (
          <>
            <button
              onClick={() => setMenuOpen(true)}
              className="fixed bottom-6 left-6 z-30 h-12 w-12 rounded-full border border-[#00a86b] bg-[#f7f4ef] text-[#00a86b] shadow-lg transition-all hover:bg-[#00a86b] hover:text-white"
              aria-label="Open menu"
            >
              <span className="font-[var(--font-terminal)] text-lg">≡</span>
            </button>
            {menuOpen ? (
              <div className="fixed inset-0 z-40">
                <div
                  className="absolute inset-0 bg-black/35"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-56 rounded-2xl border border-[#d4cfc5] bg-[#fdfcf9] p-4 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-[#d4cfc5]">
                    <span className="font-[var(--font-terminal)] text-sm text-[#1a1915]">
                      MENU
                    </span>
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="text-xs text-[#6b6560] hover:text-[#1a1915]"
                    >
                      CLOSE
                    </button>
                  </div>
                  <div className="pt-3">{navContent}</div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {/* Main Content */}
        <main className="py-8">
          <AdminAuthProvider>{children}</AdminAuthProvider>
        </main>
      </div>
    </div>
  );
}
