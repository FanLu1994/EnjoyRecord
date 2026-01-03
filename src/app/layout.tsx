import type { Metadata } from "next";
import { JetBrains_Mono, VT323 } from "next/font/google";
import TerminalSidebar from "@/components/terminal-sidebar";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const vt323 = VT323({
  variable: "--font-vt323",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EnjoyRecord",
  description: "记录阅读与观影历程的数字终端",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${jetbrainsMono.variable} ${vt323.variable}`}
        style={{
          fontFamily: 'var(--font-mono)',
        }}
      >
        <TerminalSidebar>{children}</TerminalSidebar>
      </body>
    </html>
  );
}
