import Link from "next/link";
import Button from "../../../../../Components/ui/Button";
import type { Customer, Machine } from "./types";

type MachineHeaderProps = {
  customer: Customer;
  machine: Machine;
  onEdit: () => void;
  onRecordHours: () => void;
};

export default function MachineHeader({
  customer,
  machine,
  onEdit,
  onRecordHours,
}: MachineHeaderProps) {
  const customerName =
    customer.businessName || customer.contactName || "Customer";

  return (
    <>
      <Link
        href={`/customers/${customer.id}`}
        className="text-sm font-semibold text-[#176b4d] hover:underline"
      >
        ← Back to {customerName}
      </Link>

      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#176b4d]">
            Machine profile
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            {machine.make} {machine.model}
          </h1>

          <p className="mt-1 text-slate-500">Owned by {customerName}</p>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700">
              {machine.machineType}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              {machine.hours
                ? `${Number(machine.hours).toLocaleString()} hrs`
                : "Hours not recorded"}
            </span>

            {machine.registration && (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                {machine.registration}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={onEdit}>
            Edit machine
          </Button>

          <Button type="button" onClick={onRecordHours}>
            Record hours
          </Button>
        </div>
      </div>
    </>
  );
}
