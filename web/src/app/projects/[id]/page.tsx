"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { downloadProjectExport, fetchProject, getToken, type Project } from "@/lib/api";
import { IconButton } from "@/components/IconButton";
import { DownloadIcon } from "@/components/icons";

const PdfPinViewer = dynamic(() => import("@/components/PdfPinViewer").then((m) => m.PdfPinViewer), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-neutral-400">Загрузка просмотрщика…</p>,
});

export default function ProjectViewerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport() {
    if (!project) return;
    setExportError(null);
    try {
      await downloadProjectExport(project.id, project.name);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Не удалось экспортировать файл");
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setProject(null);
    setError(null);
    fetchProject(params.id)
      .then(setProject)
      .catch((err) => setError(err instanceof Error ? err.message : "Проект не найден"));
  }, [params.id, router]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-6">
      {project && (
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-900">{project.name}</h1>
          <IconButton title="Скачать .pincode файл" variant="neutral" onClick={handleExport}>
            <DownloadIcon className="h-4 w-4" />
          </IconButton>
        </div>
      )}
      {exportError && <p className="mb-4 text-sm text-red-500">{exportError}</p>}
      {project && <PdfPinViewer projectId={project.id} />}
    </div>
  );
}
