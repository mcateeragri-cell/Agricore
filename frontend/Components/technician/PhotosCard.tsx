"use client";

import type { ChangeEvent } from "react";

import type { TechnicianJobPhoto } from "@/Components/technician/PhotoViewer";

type PhotosCardProps = {
  photos: TechnicianJobPhoto[];
  uploading: boolean;
  readOnly?: boolean;
  onUpload: (files: FileList) => void;
  onOpenPhoto: (photo: TechnicianJobPhoto) => void;
  onDeletePhoto: (photo: TechnicianJobPhoto) => void;
};

export default function PhotosCard({
  photos,
  uploading,
  readOnly = false,
  onUpload,
  onOpenPhoto,
  onDeletePhoto,
}: PhotosCardProps) {
  function handleFiles(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = event.target.files;

    if (!files?.length) {
      return;
    }

    onUpload(files);
    event.target.value = "";
  }

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            Evidence
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-950">
            Job photos
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Add clear photos of the fault, repair and completed work.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {photos.length}{" "}
          {photos.length === 1 ? "photo" : "photos"}
        </span>
      </div>

      {!readOnly ? (
        <label
          className={`mt-5 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${
            uploading
              ? "cursor-wait border-slate-200 bg-slate-50 opacity-60"
              : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            disabled={uploading}
            onChange={handleFiles}
            className="sr-only"
          />

          <span className="font-bold text-slate-900">
            {uploading
              ? "Uploading photos…"
              : "Take or upload photos"}
          </span>

          <span className="mt-1 text-sm text-slate-500">
            JPEG, PNG, HEIC or other supported image formats
          </span>
        </label>
      ) : null}

      {photos.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-semibold text-slate-700">
            No photos uploaded
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Upload supporting evidence before completing the job.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              readOnly={readOnly}
              onOpen={() => onOpenPhoto(photo)}
              onDelete={() => onDeletePhoto(photo)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PhotoTile({
  photo,
  readOnly,
  onOpen,
  onDelete,
}: {
  photo: TechnicianJobPhoto;
  readOnly: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
      >
        <div className="aspect-square overflow-hidden bg-slate-200">
          <img
            src={photo.url}
            alt={photo.caption || "Job photo"}
            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          />
        </div>

        <div className="p-3">
          <p className="truncate text-sm font-bold text-slate-900">
            {photo.caption || "Job photo"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {formatPhotoDate(photo.createdAt)}
          </p>
        </div>
      </button>

      {!readOnly ? (
        <div className="border-t border-slate-200 p-2">
          <button
            type="button"
            onClick={onDelete}
            className="min-h-10 w-full rounded-lg text-sm font-bold text-red-700 hover:bg-red-50"
          >
            Delete photo
          </button>
        </div>
      ) : null}
    </article>
  );
}

function formatPhotoDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}