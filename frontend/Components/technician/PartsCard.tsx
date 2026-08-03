type JobPart = {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  unitPrice: number | null;
};

type PartsCardProps = {
  parts: JobPart[];
  onAddPart: () => void;
  onEditPart: (part: JobPart) => void;
  onDeletePart: (part: JobPart) => void;
  readOnly?: boolean;
};

export default function PartsCard({
  parts,
  onAddPart,
  onEditPart,
  onDeletePart,
  readOnly = false,
}: PartsCardProps) {
  const total = parts.reduce(
    (sum, part) =>
      sum +
      (part.unitPrice ?? 0) * part.quantity,
    0,
  );

  return (
    <section className="mt-4 rounded-3xl border border-white/50 bg-white/90 p-5 shadow-lg backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/85">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            Parts
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
            Parts Used
          </h2>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={onAddPart}
            className="min-h-12 rounded-xl bg-[#103d2e] px-5 py-2 text-sm font-black text-white hover:bg-[#0b2f23]"
          >
            + Add Part
          </button>
        )}
      </div>

      {parts.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-semibold text-slate-700">
            No parts recorded
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Add every part used on this job before submitting.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {parts.map((part) => (
              <PartRow
                key={part.id}
                part={part}
                readOnly={readOnly}
                onEdit={() => onEditPart(part)}
                onDelete={() => onDeletePart(part)}
              />
            ))}
          </div>

          <div className="mt-5 flex justify-end border-t pt-4">
            <div className="rounded-xl bg-slate-100 px-4 py-3 text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Estimated total
              </p>

              <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                £{total.toFixed(2)}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function PartRow({
  part,
  readOnly,
  onEdit,
  onDelete,
}: {
  part: JobPart;
  readOnly: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-bold text-slate-950 dark:text-white">
            {part.description}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {part.partNumber}
          </p>
        </div>

        {!readOnly && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="min-h-11 rounded-lg border px-4 py-2 text-sm font-bold hover:bg-slate-50"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="min-h-11 rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Stat
          label="Qty"
          value={String(part.quantity)}
        />

        <Stat
          label="Unit"
          value={
            part.unitPrice == null
              ? "-"
              : `£${part.unitPrice.toFixed(2)}`
          }
        />

        <Stat
          label="Line Total"
          value={`£${(
            (part.unitPrice ?? 0) *
            part.quantity
          ).toFixed(2)}`}
        />
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}