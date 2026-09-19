"use client";

import { useEffect, useState } from "react";
import { API_URL, getToken } from "@/lib/api";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function AuthImage({ src, alt, className }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      const token = getToken();
      const res = await fetch(src.startsWith("http") ? src : `${API_URL}${src}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok || cancelled) return;
      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);
      if (!cancelled) setBlobUrl(objectUrl);
    }

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!blobUrl) {
    return <div className={`animate-pulse bg-neutral-200 ${className ?? ""}`} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={blobUrl} alt={alt} className={className} />;
}
