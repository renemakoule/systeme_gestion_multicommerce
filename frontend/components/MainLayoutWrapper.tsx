"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const isTabParam = searchParams.get("isTab") === "true";
  const [isInFrame, setIsInFrame] = useState(isTabParam);

  useEffect(() => {
    setIsInFrame(window.self !== window.top || isTabParam);
  }, [isTabParam]);

  return (
    <main className={cn(
      "flex-1 overflow-hidden",
      !isInFrame && "pt-9"
    )}>
      {children}
    </main>
  );
}
