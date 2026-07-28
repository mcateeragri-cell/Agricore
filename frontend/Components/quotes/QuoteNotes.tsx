"use client";

type QuoteNotesProps = {
  description: string;
  customerNotes: string;
  internalNotes: string;
  onDescriptionChange: (value: string) => void;
  onCustomerNotesChange: (value: string) => void;
  onInternalNotesChange: (value: string) => void;
};

export default function QuoteNotes({
  description,
  customerNotes,
  internalNotes,
  onDescriptionChange,
  onCustomerNotesChange,
  onInternalNotesChange,
}: QuoteNotesProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <label className="space-y-2 lg:col-span-2">
        <span className="text-sm font-semibold text-slate-700">
          Work description
        </span>

        <textarea
          value={description}
          onChange={(event) => {
            onDescriptionChange(event.target.value);
          }}
          rows={4}
          placeholder="Describe the work covered by this quotation..."
          className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">
          Customer notes
        </span>

        <textarea
          value={customerNotes}
          onChange={(event) => {
            onCustomerNotesChange(event.target.value);
          }}
          rows={5}
          placeholder="Terms, exclusions or information that will appear on the quotation..."
          className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
        />

        <p className="text-xs text-slate-500">
          These notes may be visible to the customer.
        </p>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">
          Internal notes
        </span>

        <textarea
          value={internalNotes}
          onChange={(event) => {
            onInternalNotesChange(event.target.value);
          }}
          rows={5}
          placeholder="Internal pricing, parts availability or follow-up information..."
          className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
        />

        <p className="text-xs text-slate-500">
          These notes are for staff and should not appear on the customer copy.
        </p>
      </label>
    </div>
  );
}