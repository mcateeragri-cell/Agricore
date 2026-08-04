type Customer = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address?: string;
  postcode?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type Machine = {
  id: string;
  displayName: string;
  registration: string;
  serialNumber: string;
};

type CustomerCardProps = {
  customer: Customer | null;
  machine: Machine | null;
};

export default function CustomerCard({ customer, machine }: CustomerCardProps) {
  const destination = [
    customer?.address,
    customer?.postcode,
    customer?.name,
  ]
    .filter(Boolean)
    .join(", ");

  const mapQuery = encodeURIComponent(destination);
  const coordinateQuery =
    customer?.latitude !== null &&
    customer?.latitude !== undefined &&
    customer?.longitude !== null &&
    customer?.longitude !== undefined
      ? `${customer.latitude},${customer.longitude}`
      : mapQuery;

  return (
    <section className="mt-4 rounded-3xl border border-white/50 bg-white/90 p-5 shadow-lg backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/85">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Site details
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
            Customer & machine
          </h2>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailCard label="Customer" value={customer?.name} />
        <DetailCard label="Contact" value={customer?.contactName} />
        <DetailCard
          label="Location"
          value={[customer?.address, customer?.postcode]
            .filter(Boolean)
            .join(", ")}
        />
        <DetailCard label="Machine" value={machine?.displayName} />
        <DetailCard
          label="Registration"
          value={machine?.registration || machine?.serialNumber}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <a
          href={customer?.phone ? `tel:${customer.phone}` : undefined}
          aria-disabled={!customer?.phone}
          className={`flex min-h-14 items-center justify-center rounded-xl px-4 text-sm font-black ${
            customer?.phone
              ? "bg-[#0c4a3a] text-white hover:bg-[#083c2f]"
              : "cursor-not-allowed bg-slate-200 text-slate-500"
          }`}
        >
          Call customer
        </a>
        <a
          href={destination ? `https://maps.apple.com/?daddr=${coordinateQuery}` : undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!destination}
          className={`flex min-h-14 items-center justify-center rounded-xl border px-4 text-sm font-black ${
            destination
              ? "border-slate-300 bg-white text-slate-900 hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
          }`}
        >
          Open maps
        </a>
      </div>
    </section>
  );
}

function DetailCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
        {value || "—"}
      </p>
    </div>
  );
}
