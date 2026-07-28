"use client";

export type TechnicianJobPhoto = {
  id: string;
  jobId: string;
  uploadedBy: string | null;
  filePath: string;
  caption: string;
  createdAt: string;
  url: string;
};

type PhotoViewerProps = {
  photo: TechnicianJobPhoto | null;
  onClose: () => void;
};

export default function PhotoViewer({
  photo,
  onClose,
}: PhotoViewerProps) {
  if (!photo) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Job photo viewer"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-5xl flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="truncate font-bold">
              {photo.caption || "Job photo"}
            </p>

            <p className="mt-1 text-xs text-white/70">
              {formatPhotoDate(photo.createdAt)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"
          >
            Close
          </button>
        </div>

        <img
          src={photo.url}
          alt={photo.caption || "Job photo"}
          className="max-h-[82vh] w-full rounded-xl object-contain"
        />
      </div>
    </div>
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