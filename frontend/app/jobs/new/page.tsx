"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Card from "../../../Components/ui/Card";

type Customer = {
  id: string;
  contactName: string;
  businessName: string;
};

type Machine = {
  id: string;
  customerId: string;
  make: string;
  model: string;
  registration: string;
  serialNumber: string;
  hours: number | null;
};

export default function NewJobPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [engineerName, setEngineerName] = useState("James McAteer");
  const [priority, setPriority] = useState("normal");
  const [faultReported, setFaultReported] = useState("");
  const [machineHours, setMachineHours] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadFormData() {
      setLoadingData(true);
      setErrorMessage("");

      const [customersResult, machinesResult] = await Promise.all([
        supabase
          .from("customers")
          .select("id, contact_name, business_name")
          .order("business_name", { ascending: true }),

        supabase
          .from("machines")
          .select(
            "id, customer_id, make, model, registration, serial_number, hours"
          )
          .order("make", { ascending: true }),
      ]);

      if (customersResult.error) {
        console.error(customersResult.error);
        setErrorMessage(
          `Unable to load customers: ${customersResult.error.message}`
        );
        setLoadingData(false);
        return;
      }

      if (machinesResult.error) {
        console.error(machinesResult.error);
        setErrorMessage(
          `Unable to load machines: ${machinesResult.error.message}`
        );
        setLoadingData(false);
        return;
      }

      const formattedCustomers: Customer[] = (
        customersResult.data ?? []
      ).map((customer) => ({
        id: customer.id,
        contactName: customer.contact_name ?? "",
        businessName: customer.business_name ?? "",
      }));

      const formattedMachines: Machine[] = (machinesResult.data ?? []).map(
        (machine) => ({
          id: machine.id,
          customerId: machine.customer_id,
          make: machine.make ?? "",
          model: machine.model ?? "",
          registration: machine.registration ?? "",
          serialNumber: machine.serial_number ?? "",
          hours:
            machine.hours === null || machine.hours === undefined
              ? null
              : Number(machine.hours),
        })
      );

      setCustomers(formattedCustomers);
      setMachines(formattedMachines);
      setLoadingData(false);
    }

    void loadFormData();
  }, []);

  const availableMachines = useMemo(() => {
    if (!customerId) return [];

    return machines.filter(
      (machine) => machine.customerId === customerId
    );
  }, [customerId, machines]);

  function handleCustomerChange(newCustomerId: string) {
    setCustomerId(newCustomerId);
    setMachineId("");
    setMachineHours("");
  }

  function handleMachineChange(newMachineId: string) {
    setMachineId(newMachineId);

    const selectedMachine = machines.find(
      (machine) => machine.id === newMachineId
    );

    setMachineHours(
      selectedMachine?.hours !== null &&
        selectedMachine?.hours !== undefined
        ? String(selectedMachine.hours)
        : ""
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customerId) {
      setErrorMessage("Select a customer.");
      return;
    }

    if (!machineId) {
      setErrorMessage("Select a machine.");
      return;
    }

    if (!faultReported.trim()) {
      setErrorMessage("Enter the fault reported or reason for the job.");
      return;
    }

    const parsedMachineHours =
      machineHours.trim() === "" ? null : Number(machineHours);

    if (
      parsedMachineHours !== null &&
      (!Number.isFinite(parsedMachineHours) || parsedMachineHours < 0)
    ) {
      setErrorMessage("Enter a valid machine-hours figure.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        customer_id: customerId,
        machine_id: machineId,
        engineer_name: engineerName.trim() || null,
        priority,
        status: "open",
        fault_reported: faultReported.trim(),
        machine_hours: parsedMachineHours,
        
      })
      .select("id, job_number")
      .single();

    if (error) {
      console.error("Unable to create job:", error);
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    router.push(`/jobs/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            New Job
          </h1>

          <p className="mt-1 text-gray-500">
            Create a new workshop or field-service job card.
          </p>
        </div>

        <Link
          href="/jobs"
          className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Back to Jobs
        </Link>
      </div>

      <Card>
        {loadingData ? (
          <div className="py-12 text-center text-gray-500">
            Loading customers and machines...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="customer"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Customer
                </label>

                <select
                  id="customer"
                  value={customerId}
                  onChange={(event) =>
                    handleCustomerChange(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                  required
                >
                  <option value="">Select customer</option>

                  {customers.map((customer) => {
                    const displayName =
                      customer.businessName ||
                      customer.contactName ||
                      "Unnamed customer";

                    return (
                      <option key={customer.id} value={customer.id}>
                        {displayName}
                        {customer.businessName &&
                        customer.contactName
                          ? ` — ${customer.contactName}`
                          : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label
                  htmlFor="machine"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Machine
                </label>

                <select
                  id="machine"
                  value={machineId}
                  onChange={(event) =>
                    handleMachineChange(event.target.value)
                  }
                  disabled={!customerId}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                  required
                >
                  <option value="">
                    {!customerId
                      ? "Select a customer first"
                      : availableMachines.length === 0
                        ? "No machines recorded for this customer"
                        : "Select machine"}
                  </option>

                  {availableMachines.map((machine) => {
                    const machineName =
                      [machine.make, machine.model]
                        .filter(Boolean)
                        .join(" ") || "Unnamed machine";

                    return (
                      <option key={machine.id} value={machine.id}>
                        {machineName}
                        {machine.registration
                          ? ` — ${machine.registration}`
                          : ""}
                      </option>
                    );
                  })}
                </select>

                {customerId && availableMachines.length === 0 && (
                  <p className="mt-2 text-sm text-amber-700">
                    This customer has no machines recorded yet.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="engineer"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Engineer
                </label>

                <select
                  id="engineer"
                  value={engineerName}
                  onChange={(event) =>
                    setEngineerName(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                >
                  <option value="James McAteer">
                    James McAteer
                  </option>
                  <option value="Aiden Coady">Aiden Coady</option>
                  <option value="">Unassigned</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="machineHours"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Machine Hours
                </label>

                <input
                  id="machineHours"
                  type="number"
                  min="0"
                  step="0.1"
                  value={machineHours}
                  onChange={(event) =>
                    setMachineHours(event.target.value)
                  }
                  placeholder="e.g. 8498"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                />
              </div>
            </div>

            <div>
              <p className="mb-3 block text-sm font-semibold text-gray-700">
                Priority
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    value: "normal",
                    label: "Normal",
                    description: "Standard scheduling",
                  },
                  {
                    value: "high",
                    label: "High",
                    description: "Needs prompt attention",
                  },
                  {
                    value: "urgent",
                    label: "Urgent",
                    description: "Machine stopped or critical",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      priority === option.value
                        ? "border-[#103d2e] bg-[#103d2e]/5 ring-1 ring-[#103d2e]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="priority"
                        value={option.value}
                        checked={priority === option.value}
                        onChange={(event) =>
                          setPriority(event.target.value)
                        }
                        className="mt-1"
                      />

                      <div>
                        <p className="font-semibold text-gray-900">
                          {option.label}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="faultReported"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Fault Reported / Work Requested
              </label>

              <textarea
                id="faultReported"
                value={faultReported}
                onChange={(event) =>
                  setFaultReported(event.target.value)
                }
                rows={6}
                placeholder="Describe the customer's reported fault or the work requested..."
                className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                required
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/jobs"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={
                  submitting ||
                  !customerId ||
                  !machineId ||
                  !faultReported.trim()
                }
                className="inline-flex items-center justify-center rounded-xl bg-[#103d2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0c3024] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Creating Job..." : "Create Job"}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}