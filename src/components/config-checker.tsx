"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function ConfigChecker() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkConfig = async () => {
      // Skip check if already on error page
      if (pathname === "/admin-not-configured") {
        return;
      }

      try {
        const response = await fetch("/api/admin/check");
        const data = (await response.json()) as { configured: boolean };

        if (!data.configured) {
          router.replace("/admin-not-configured");
        }
      } catch (error) {
        console.error("Failed to check admin config:", error);
      }
    };

    checkConfig();
  }, [router, pathname]);

  return null;
}
