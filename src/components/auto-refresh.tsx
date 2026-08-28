"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const intervalo = setInterval(() => {
      router.refresh();
    }, 30000);

    return () => clearInterval(intervalo);
  }, [router]);

  return null;
}