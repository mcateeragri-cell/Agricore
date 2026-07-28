"use client";

export type QuoteCustomerOption = {
  id: string;
  name?: string | null;
  company_name?: string | null;
  business_name?: string | null;
  contact_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export type QuoteMachineOption = {
  id: string;
  customer_id?: string | null;
  make?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  registration?: string | null;
  registration_number?: string | null;
  serial_number?: string | null;
};

type QuoteCustomerProps = {
  customers: QuoteCustomerOption[];
  machines: QuoteMachineOption[];
  customerId: string;
  machineId: string;
  onCustomerChange: (value: string) => void;
  onMachineChange: (value: string) => void;
};

export default function QuoteCustomer({
  customers,
  machines,
  customerId,
  machineId,
  onCustomerChange,
  onMachineChange,
}: QuoteCustomerProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">
          Customer
        </span>

        <select
          value={customerId}
          onChange={(event) => {
            onCustomerChange(event.target.value);
          }}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
        >
          <option value="">Select a customer</option>

          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {getCustomerName(customer)}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">
          Machine
        </span>

        <select
          value={machineId}
          onChange={(event) => {
            onMachineChange(event.target.value);
          }}
          disabled={!customerId}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="">
            {!customerId
              ? "Select a customer first"
              : machines.length === 0
                ? "No machine selected"
                : "Select a machine"}
          </option>

          {machines.map((machine) => (
            <option key={machine.id} value={machine.id}>
              {getMachineName(machine)}
            </option>
          ))}
        </select>

        {customerId && machines.length === 0 ? (
          <p className="text-xs text-slate-500">
            This customer does not currently have any machines recorded.
          </p>
        ) : null}
      </label>
    </div>
  );
}

function getCustomerName(customer: QuoteCustomerOption) {
  const businessName =
    customer.business_name?.trim() ||
    customer.company_name?.trim() ||
    customer.name?.trim();

  const personalName = [
    customer.first_name?.trim(),
    customer.last_name?.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    businessName ||
    customer.contact_name?.trim() ||
    personalName ||
    "Unnamed customer"
  );
}

function getMachineName(machine: QuoteMachineOption) {
  const manufacturer =
    machine.manufacturer?.trim() || machine.make?.trim() || "";

  const model = machine.model?.trim() || "";

  const primaryName = [manufacturer, model].filter(Boolean).join(" ");

  const registration =
    machine.registration_number?.trim() ||
    machine.registration?.trim() ||
    "";

  const serialNumber = machine.serial_number?.trim() || "";

  const identifier = registration || serialNumber;

  if (primaryName && identifier) {
    return `${primaryName} · ${identifier}`;
  }

  return primaryName || identifier || "Unnamed machine";
}