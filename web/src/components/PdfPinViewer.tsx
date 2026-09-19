"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { Pin } from "@/lib/api";
import { createPin, deletePin, fetchPins, getToken, pdfUrl, updatePin, uploadPinPhoto } from "@/lib/api";
import { PinDetailModal } from "./PinDetailModal";
import { PinFormModal } from "./PinFormModal";
import { IconButton } from "./IconButton";
import { PlusIcon, MinusIcon } from "./icons";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const POLL_INTERVAL_MS = 7000;

type Props = {
  projectId: string;
};

type PendingLocation = { x: number; y: number } | null;

export function PdfPinViewer({ projectId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<PendingLocation>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(Math.min(width, 1000));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function reloadPins() {
    fetchPins(projectId)
      .then(setPins)
      .catch(() => {});
  }

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetchPins(projectId)
        .then((data) => {
          if (!cancelled) setPins(data);
        })
        .catch(() => {});
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectId]);

  function handlePageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isPlacingPin || pageSize.width === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / pageSize.width;
    const y = (e.clientY - rect.top) / pageSize.height;
    setPendingLocation({ x, y });
  }

  async function handleCreatePin(description: string, files: File[]) {
    if (!pendingLocation) return;
    const pin = await createPin({
      projectId,
      pageNumber,
      x: pendingLocation.x,
      y: pendingLocation.y,
      description,
    });
    for (const file of files) {
      await uploadPinPhoto(pin.id, file);
    }
    setPendingLocation(null);
    setIsPlacingPin(false);
    reloadPins();
  }

  async function handleSavePin(pinId: string, description: string) {
    const updated = await updatePin(pinId, description);
    setPins((prev) => prev.map((p) => (p.id === pinId ? updated : p)));
    setSelectedPin(updated);
  }

  async function handleDeletePin(pinId: string) {
    await deletePin(pinId);
    setSelectedPin(null);
    reloadPins();
  }

  const pinsOnPage = pins.filter((pin) => pin.page_number === pageNumber);
  const token = getToken();
  const documentOptions = useMemo(
    () => (token ? { httpHeaders: { Authorization: `Bearer ${token}` } } : undefined),
    [token]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-[1000px] items-center justify-between">
        <div className="flex items-center gap-3">
          {numPages > 1 && (
            <>
              <button
                className="rounded-full bg-neutral-800 px-3 py-1 text-white disabled:opacity-40"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              <span className="text-sm text-neutral-600">
                Стр. {pageNumber} из {numPages}
              </span>
              <button
                className="rounded-full bg-neutral-800 px-3 py-1 text-white disabled:opacity-40"
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              >
                ›
              </button>
            </>
          )}
          {isPlacingPin && (
            <p className="rounded-full bg-orange-50 px-4 py-1.5 text-sm text-orange-600">
              Кликните по чертежу, чтобы поставить пин
            </p>
          )}
        </div>

        <IconButton
          title={isPlacingPin ? "Отменить добавление" : "Добавить пин"}
          variant="primary"
          onClick={() => setIsPlacingPin((prev) => !prev)}
        >
          {isPlacingPin ? <MinusIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
        </IconButton>
      </div>

      <div className="relative w-full max-w-[1000px]">
        <div
          ref={containerRef}
          onClick={handlePageClick}
          className={`relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm ${
            isPlacingPin ? "cursor-crosshair" : ""
          }`}
        >
          <Document
            file={pdfUrl(projectId)}
            options={documentOptions}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            loading={<p className="p-8 text-center text-neutral-400">Загрузка PDF…</p>}
            error={<p className="p-8 text-center text-red-500">Не удалось загрузить PDF</p>}
          >
            {containerWidth > 0 && (
              <Page
                pageNumber={pageNumber}
                width={containerWidth}
                onRenderSuccess={(page) => setPageSize({ width: page.width, height: page.height })}
              />
            )}
          </Document>

          {pageSize.width > 0 &&
            pinsOnPage.map((pin, index) => (
              <button
                key={pin.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPin(pin);
                }}
                className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full border-2 border-white bg-orange-500 text-xs font-bold text-white shadow-md hover:scale-110"
                style={{ left: pin.x * pageSize.width, top: pin.y * pageSize.height }}
              >
                {index + 1}
              </button>
            ))}
        </div>
      </div>

      <PinFormModal
        open={pendingLocation !== null}
        onCancel={() => setPendingLocation(null)}
        onSubmit={handleCreatePin}
      />
      <PinDetailModal
        pin={selectedPin}
        onClose={() => setSelectedPin(null)}
        onSave={handleSavePin}
        onDelete={handleDeletePin}
      />
    </div>
  );
}
