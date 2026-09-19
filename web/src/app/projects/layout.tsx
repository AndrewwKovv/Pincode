"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
