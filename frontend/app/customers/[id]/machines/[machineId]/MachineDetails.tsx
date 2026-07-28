import Card from "../../../../../Components/ui/Card";
import type { Machine } from "./types";

type MachineDetailsProps = {
  machine: Machine;
};

export default function MachineDetails({ machine }: MachineDetailsProps) {
  return (
    <Card className="p-6 xl:col-span-2">
      <h2 className="text-lg font-bold">Machine information</h2>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Detail label="Make" value={machine.make} />
        <Detail label="Model" value={machine.model} />
        <Detail label="Machine type" value={machine.machineType} />
        <Detail label="Year" value={machine.year} />
        <Detail label="Registration" value={machine.registration} />
        <Detail label="Serial number" value={machine.serialNumber} />
        <Detail
          label="Current hours"
          value={
            machine.hours
              ? `${Number(machine.hours).toLocaleString()} hrs`
              : ""
          }
        />
      </div>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{value || "Not provided"}</p>
    </div>
  );
}
