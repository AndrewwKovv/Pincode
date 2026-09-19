"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  clearToken,
  deleteProject,
  fetchProjects,
  importProjectFile,
  renameProject,
  type Project,
} from "@/lib/api";
import { IconButton } from "./IconButton";
import { ArrowDownIcon, PencilIcon, PlusIcon, SearchIcon, XIcon } from "./icons";
import { isNameTaken, suggestUniqueName } from "@/lib/uniqueName";

const POLL_INTERVAL_MS = 10000;

export function Sidebar() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const activeId = params?.id;

  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetchProjects()
        .then((data) => {
          if (!cancelled) setProjects(data);
        })
        .catch(() => {});
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function startRename(project: Project) {
    setEditingId(project.id);
    setEditingName(project.name);
  }

  async function commitRename(project: Project) {
    const name = editingName.trim();
    setEditingId(null);
    if (!name || name === project.name) return;
    const updated = await renameProject(project.id, name);
    setProjects((prev) => prev.map((p) => (p.id === project.id ? updated : p)));
  }

  async function handleDelete(project: Project) {
    if (!window.confirm(`Удалить «${project.name}»? Это действие необратимо.`)) return;
    await deleteProject(project.id);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    if (activeId === project.id) router.push("/projects");
  }

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportError(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as { project?: { name?: string } };
      const desiredName = payload.project?.name?.trim() || "Без названия";
      const existingNames = projects.map((p) => p.name);

      let finalName = desiredName;
      if (isNameTaken(desiredName, existingNames)) {
        const suggested = suggestUniqueName(desiredName, existingNames);
        const confirmed = window.confirm(
          `Объект «${desiredName}» уже существует. Добавить как «${suggested}»?`
        );
        if (!confirmed) return;
        finalName = suggested;
      }

      payload.project = { ...payload.project, name: finalName };
      const project = await importProjectFile(JSON.stringify(payload));
      setProjects((prev) => [project, ...prev]);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Не удалось импортировать файл");
    }
  }

  const visibleProjects = projects
    .filter((project) => project.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortAsc ? diff : -diff;
    });

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
        <h1 className="text-base font-semibold text-neutral-900">Pincode</h1>
        <IconButton title="Импортировать файл .pincode" variant="primary" onClick={() => fileInputRef.current?.click()}>
          <PlusIcon className="h-4 w-4" />
        </IconButton>
        <input ref={fileInputRef} type="file" accept=".pincode" onChange={handleImportFile} className="hidden" />
      </div>

      {importError && (
        <p className="border-b border-neutral-200 bg-red-50 px-4 py-2 text-xs text-red-500">{importError}</p>
      )}

      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию"
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-2 text-sm text-neutral-800 outline-none focus:border-orange-400"
          />
        </div>
        <IconButton
          title={sortAsc ? "Сначала старые (сменить на новые)" : "Сначала новые (сменить на старые)"}
          variant="neutral"
          onClick={() => setSortAsc((prev) => !prev)}
        >
          <ArrowDownIcon className={`h-4 w-4 transition-transform ${sortAsc ? "rotate-180" : ""}`} />
        </IconButton>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {visibleProjects.length === 0 && (
          <p className="px-4 py-6 text-sm text-neutral-400">
            {projects.length === 0 ? "Пока нет объектов" : "Ничего не найдено"}
          </p>
        )}

        {visibleProjects.map((project) => {
          const isActive = project.id === activeId;
          const isEditing = editingId === project.id;

          return (
            <div
              key={project.id}
              className={`group relative mx-2 mb-1 rounded-lg ${
                isActive ? "bg-orange-50" : "hover:bg-neutral-100"
              }`}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => commitRename(project)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(project);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="w-full rounded-lg border border-orange-400 px-3 py-2 text-sm outline-none"
                />
              ) : (
                <Link
                  href={`/projects/${project.id}`}
                  className="block truncate px-3 py-2 pr-20 text-sm font-medium text-neutral-800"
                >
                  {project.name}
                </Link>
              )}

              {!isEditing && (
                <div className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 gap-1 group-hover:flex">
                  <IconButton title="Переименовать" variant="neutral" onClick={() => startRename(project)}>
                    <PencilIcon className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton title="Удалить" variant="danger" onClick={() => handleDelete(project)}>
                    <XIcon className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-neutral-200 p-3">
        <button
          onClick={handleLogout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-100"
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
