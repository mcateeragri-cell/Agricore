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
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            Uploaded photos
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            View and manage photos already attached to this job.
          </p>
        </div>

        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200">
          {photos.length} photo
          {photos.length === 1 ? "" : "s"}
        </span>
      </div>

      {photos.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950/50">
          <p className="font-bold text-slate-900 dark:text-white">
            No photos added yet
          </p>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Use the camera or upload buttons above to add photos.
          </p>
        </div>
      )}

      {!readOnly ? (
        <label className="mt-4 flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white dark:hover:bg-slate-900">
          {uploading
            ? "Uploading photos…"
            : "Upload more photos"}

          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={handleFiles}
            className="hidden"
          />
        </label>
      ) : null}
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
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
      >
        <div className="aspect-square overflow-hidden bg-slate-200 dark:bg-slate-800">
          <img
            src={photo.url}
            alt={photo.caption || "Job photo"}
            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          />
        </div>

        <div className="p-3">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {photo.caption || "Job photo"}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {formatPhotoDate(photo.createdAt)}
          </p>
        </div>
      </button>

      {!readOnly ? (
        <div className="border-t border-slate-200 p-2 dark:border-slate-700">
          <button
            type="button"
            onClick={onDelete}
            className="min-h-10 w-full rounded-lg text-sm font-bold text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
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