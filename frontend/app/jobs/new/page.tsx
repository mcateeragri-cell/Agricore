"use client";

import FieldRolePageGate from "@/Components/auth/field-role-page-gate";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadActiveCompany } from "@/lib/company-context-client";
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

type Engineer = {
  userId: string;
  fullName: string;
};

function NewJobPageContent() {
  const router = useRouter();

  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [engineerName, setEngineerName] = useState("");
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

      try {
        const activeCompany =
          await loadActiveCompany();

        setActiveCompanyId(activeCompany.id);

        const [
          customersResult,
          machinesResult,
          engineersResult,
        ] = await Promise.all([
          supabase
            .from("customers")
            .select(
              "id, contact_name, business_name",
            )
            .eq(
              "company_id",
              activeCompany.id,
            )
            .order("business_name", {
              ascending: true,
            }),

          supabase
            .from("machines")
            .select(
              "id, customer_id, make, model, registration, serial_number, hours",
            )
            .eq(
              "company_id",
              activeCompany.id,
            )
            .order("make", {
              ascending: true,
            }),

          supabase
            .from("company_member_profiles")
            .select("user_id, full_name")
            .eq(
              "company_id",
              activeCompany.id,
            )
            .eq("is_active", true)
            .order("full_name", {
              ascending: true,
            }),
        ]);

        if (customersResult.error) {
          throw new Error(
            `Unable to load customers: ${customersResult.error.message}`,
          );
        }

        if (machinesResult.error) {
          throw new Error(
            `Unable to load machines: ${machinesResult.error.message}`,
          );
        }

        if (engineersResult.error) {
          throw new Error(
            `Unable to load engineers: ${engineersResult.error.message}`,
          );
        }

        const formattedCustomers: Customer[] = (
          customersResult.data ?? []
        ).map((customer) => ({
          id: customer.id,
          contactName:
            customer.contact_name ?? "",
          businessName:
            customer.business_name ?? "",
        }));

        const formattedMachines: Machine[] = (
          machinesResult.data ?? []
        ).map((machine) => ({
          id: machine.id,
          customerId: machine.customer_id,
          make: machine.make ?? "",
          model: machine.model ?? "",
          registration:
            machine.registration ?? "",
          serialNumber:
            machine.serial_number ?? "",
          hours:
            machine.hours === null ||
            machine.hours === undefined
              ? null
              : Number(machine.hours),
        }));

        const formattedEngineers: Engineer[] = (
          engineersResult.data ?? []
        )
          .filter(
            (engineer) =>
              typeof engineer.full_name ===
                "string" &&
              engineer.full_name.trim().length > 0,
          )
          .map((engineer) => ({
            userId: engineer.user_id,
            fullName: engineer.full_name.trim(),
          }));

        setCustomers(formattedCustomers);
        setMachines(formattedMachines);
        setEngineers(formattedEngineers);
      } catch (error) {
        console.error(
          "Unable to load new-job data:",
          error,
        );

        setActiveCompanyId("");
        setCustomers([]);
        setMachines([]);
        setEngineers([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load job form data.",
        );
      } finally {
        setLoadingData(false);
      }
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

    if (!activeCompanyId) {
      setErrorMessage(
        "No active company is available.",
      );
      return;
    }

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
        company_id: activeCompanyId,
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
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            New Job
          </h1>

          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Create a workshop or field-service job with customer, machine and engineer details.
          </p>
        </div>

        <Link
          href="/jobs"
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-900/60"
        >
          Back to Jobs
        </Link>
      </div>

      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {loadingData ? (
          <div className="py-12 text-center text-slate-600 dark:text-slate-400">
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
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Customer
                </label>

                <select
                  id="customer"
                  value={customerId}
                  onChange={(event) =>
                    handleCustomerChange(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
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
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
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
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-slate-600 dark:text-slate-400 focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
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
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Engineer
                </label>

                <select
                  id="engineer"
                  value={engineerName}
                  onChange={(event) =>
                    setEngineerName(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                >
                  <option value="">
                    Unassigned
                  </option>
                  {engineers.map((engineer) => (
                    <option
                      key={engineer.userId}
                      value={engineer.fullName}
                    >
                      {engineer.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="machineHours"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
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
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-gray-400 focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                />
              </div>
            </div>

            <div>
              <p className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-300">
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
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700"
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
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {option.label}
                        </p>

                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
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
                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Fault Reported / Work Requested
              </label>

              <textarea
                id="faultReported"
                value={faultReported}
                onChange={(event) =>
                  setFaultReported(event.target.value)
                }
                rows={8}
                placeholder="Describe the customer's reported fault or the work requested..."
                className="w-full resize-y rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-gray-400 focus:border-[#103d2e] focus:ring-2 focus:ring-[#103d2e]/15"
                required
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/jobs"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-900/60"
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

export default function NewJobPage() {
  return (
    <FieldRolePageGate>
      <NewJobPageContent />
    </FieldRolePageGate>
  );
}
