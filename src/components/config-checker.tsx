"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";

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
        const response = await axios.get<{ configured: boolean }>("/api/admin/check");
        if (!response.data.configured) {
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
