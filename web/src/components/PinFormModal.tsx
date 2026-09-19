"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import { XIcon, CheckIcon, PlusIcon } from "./icons";

type Props = {
  open: boolean;
  onCancel: () => void;
  onSubmit: (description: string, files: File[]) => void;
};

export function PinFormModal({ open, onCancel, onSubmit }: Props) {
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  if (!open) return null;

  function reset() {
    setDescription("");
    setFiles([]);
  }

  function handleSubmit() {
    const trimmed = description.trim();
    if (!trimmed) return;
    onSubmit(trimmed, files);
    reset();
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleCancel}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-base font-semibold text-neutral-900">Новое замечание</p>
          <IconButton title="Отмена" variant="neutral" onClick={handleCancel}>
            <XIcon className="h-4 w-4" />
          </IconButton>
        </div>

        <textarea
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание замечания"
          rows={4}
          className="mb-4 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-orange-400"
        />

        <div className="mb-4 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrls[index]}
                alt={file.name}
                className="h-16 w-16 rounded-lg border border-neutral-200 object-cover"
              />
              <button
                onClick={() => removeFile(index)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-red-300 bg-white text-red-500 hover:bg-red-50"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          ))}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-400 hover:border-orange-400 hover:text-orange-500"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!description.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-40"
          >
            <CheckIcon className="h-4 w-4" />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
