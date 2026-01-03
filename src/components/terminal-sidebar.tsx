"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "HOME", icon: ">_", sublabel: "首页" },
  { href: "/library", label: "LIB", icon: "[]", sublabel: "库" },
  { href: "/stats", label: "STAT", icon: "%", sublabel: "统计" },
  { href: "/new", label: "NEW", icon: "+", sublabel: "添加" },
  { href: "/settings", label: "SET", icon: ":", sublabel: "设置" },
] as const;

export default function TerminalSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      {/* Container for sidebar + content */}
      <div className="relative max-w-[var(--page-max-width)] mx-auto px-[var(--content-padding)]">
        {/* Sidebar - fixed to viewport center, aligned to content left */}
        <div
          className="fixed top-1/2 -translate-y-1/2 -translate-x-full z-10"
          style={{
            left:
              "max(var(--content-padding), calc((100vw - var(--page-max-width)) / 2 + var(--content-padding)))",
            marginLeft: "-1rem",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
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
        </div>

        {/* Main Content */}
        <main className="py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
