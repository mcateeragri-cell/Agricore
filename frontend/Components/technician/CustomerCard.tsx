type Customer = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
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

export default function CustomerCard({
  customer,
  machine,
}: CustomerCardProps) {
  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">
        Customer & Machine
      </h2>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Customer
          </p>

          <div className="mt-2 space-y-2">
            <Row
              label="Business"
              value={customer?.name}
            />

            <Row
              label="Contact"
              value={customer?.contactName}
            />

            <Row
              label="Telephone"
              value={customer?.phone}
            />

            <Row
              label="Email"
              value={customer?.email}
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Machine
          </p>

          <div className="mt-2 space-y-2">
            <Row
              label="Machine"
              value={machine?.displayName}
            />

            <Row
              label="Registration"
              value={machine?.registration}
            />

            <Row
              label="Serial"
              value={machine?.serialNumber}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm font-semibold text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-bold text-slate-900">
        {value || "—"}
      </span>
    </div>
  );
}