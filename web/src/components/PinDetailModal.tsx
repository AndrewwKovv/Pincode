"use client";

import { useEffect, useState } from "react";
import type { Pin, Photo } from "@/lib/api";
import { fetchPhotos, photoUrl } from "@/lib/api";
import { AuthImage } from "./AuthImage";
import { IconButton } from "./IconButton";
import { PencilIcon, XIcon, CheckIcon } from "./icons";

type Props = {
  pin: Pin | null;
  onClose: () => void;
  onSave: (pinId: string, description: string) => Promise<void>;
  onDelete: (pinId: string) => Promise<void>;
};

export function PinDetailModal({ pin, onClose, onSave, onDelete }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");

  useEffect(() => {
    if (!pin) return;
    setPhotos([]);
    setIsEditing(false);
    fetchPhotos(pin.id).then(setPhotos).catch(() => setPhotos([]));
  }, [pin]);

  if (!pin) return null;

  function startEditing() {
    setDraftDescription(pin!.description);
    setIsEditing(true);
  }

  async function handleSave() {
    const trimmed = draftDescription.trim();
    if (!trimmed) return;
    await onSave(pin!.id, trimmed);
    setIsEditing(false);
  }

  async function handleDelete() {
    if (!window.confirm("Удалить этот пин вместе с фото?")) return;
    await onDelete(pin!.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          {isEditing ? (
            <textarea
              autoFocus
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-orange-300 px-3 py-2 text-sm text-neutral-900 outline-none"
            />
          ) : (
            <p className="text-lg font-semibold text-neutral-900">{pin.description}</p>
          )}

          <div className="flex shrink-0 gap-1.5">
            {isEditing ? (
              <IconButton title="Сохранить" variant="primary" onClick={handleSave}>
                <CheckIcon className="h-4 w-4" />
              </IconButton>
            ) : (
              <IconButton title="Редактировать" variant="neutral" onClick={startEditing}>
                <PencilIcon className="h-4 w-4" />
              </IconButton>
            )}
            <IconButton title="Удалить" variant="danger" onClick={handleDelete}>
              <XIcon className="h-4 w-4" />
            </IconButton>
            <IconButton title="Закрыть" variant="neutral" onClick={onClose}>
              <XIcon className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <p className="mb-4 text-sm text-neutral-500">
          {pin.author_name} · {new Date(pin.created_at).toLocaleString("ru-RU")}
        </p>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <AuthImage
                key={photo.id}
                src={photoUrl(photo.id)}
                alt="Фото замечания"
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Фото нет</p>
        )}
      </div>
    </div>
  );
}
