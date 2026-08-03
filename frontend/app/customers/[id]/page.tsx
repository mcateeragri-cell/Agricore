"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "../../../Components/ui/Button";
import Card from "../../../Components/ui/Card";
import { useNavigationUser } from "../../../Components/navigation/use-navigation-user";

type Customer = {
  id: string;
  name: string;
  businessName: string;
  customerType: string;
  phone: string;
  email: string;
  address: string;
  postcode: string;
  vatNumber: string;
  notes: string;
};

type Machine = {
  id: string;
  customerId: string;
  make: string;
  model: string;
  machineType: string;
  year: string;
  registration: string;
  serialNumber: string;
  hours: string;
  usageProfile: "light" | "medium" | "heavy";
  estimatedHoursPerWeek: string;
  notes: string;
};

const emptyCustomerForm = {
  contactName: "",
  businessName: "",
  customerType: "Farm",
  phone: "",
  email: "",
  address: "",
  postcode: "",
  vatNumber: "",
  notes: "",
};

const emptyMachineForm = {
  make: "",
  model: "",
  machineType: "Tractor",
  year: "",
  registration: "",
  serialNumber: "",
  hours: "",
  usageProfile: "medium" as "light" | "medium" | "heavy",
  estimatedHoursPerWeek: "25",
  notes: "",
};

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const { userState, loading: isLoadingUser } =
    useNavigationUser();

  const companyId = userState.activeCompany?.id ?? "";

  const canEditCustomer =
    userState.permissions.includes("customers.edit");

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [machines, setMachines] = useState<Machine[]>([]);

  const [showCustomerForm, setShowCustomerForm] =
    useState(false);
  const [customerForm, setCustomerForm] =
    useState(emptyCustomerForm);
  const [isSavingCustomer, setIsSavingCustomer] =
    useState(false);
  const [customerError, setCustomerError] = useState("");

  const [showMachineForm, setShowMachineForm] =
    useState(false);

  const [machineForm, setMachineForm] =
    useState(emptyMachineForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingMachine, setIsSavingMachine] =
    useState(false);

  const [pageError, setPageError] = useState("");
  const [machineError, setMachineError] = useState("");

  const loadCustomer = useCallback(async () => {
    if (!companyId) {
      setCustomer(null);
      return null;
    }
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      console.error("Error loading customer:", error);
      setPageError(
        `Unable to load customer: ${error.message}`,
      );
      return null;
    }

    if (!data) {
      setCustomer(null);
      return null;
    }

    const loadedCustomer: Customer = {
      id: data.id,
      name: data.contact_name ?? "",
      businessName: data.business_name ?? "",
      customerType: data.customer_type ?? "Farm",
      phone: data.phone ?? "",
      email: data.email ?? "",
      address: data.address ?? "",
      postcode: data.postcode ?? "",
      vatNumber: data.vat_number ?? "",
      notes: data.notes ?? "",
    };

    setCustomer(loadedCustomer);
    return loadedCustomer;
  }, [companyId, customerId]);

  const loadMachines = useCallback(async () => {
    if (!companyId) {
      setMachines([]);
      return;
    }
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .eq("customer_id", customerId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading machines:", error);
      setPageError(
        `Unable to load machines: ${error.message}`,
      );
      return;
    }

    const loadedMachines: Machine[] = (data ?? []).map(
      (machine) => ({
        id: machine.id,
        customerId: machine.customer_id,
        make: machine.make ?? "",
        model: machine.model ?? "",
        machineType: machine.machine_type ?? "Other",
        year:
          machine.year === null ||
          machine.year === undefined
            ? ""
            : String(machine.year),
        registration: machine.registration ?? "",
        serialNumber: machine.serial_number ?? "",
        hours:
          machine.hours === null ||
          machine.hours === undefined
            ? ""
            : String(machine.hours),
        usageProfile: machine.usage_profile ?? "medium",
        estimatedHoursPerWeek: String(
          machine.estimated_hours_per_week ?? 25,
        ),
        notes: machine.notes ?? "",
      }),
    );

    setMachines(loadedMachines);
  }, [companyId, customerId]);

  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    setPageError("");

    await Promise.all([
      loadCustomer(),
      loadMachines(),
    ]);

    setIsLoading(false);
  }, [loadCustomer, loadMachines]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  function openCustomerForm() {
    if (!customer || !canEditCustomer) {
      return;
    }

    setCustomerError("");
    setCustomerForm({
      contactName: customer.name,
      businessName: customer.businessName,
      customerType: customer.customerType,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      postcode: customer.postcode,
      vatNumber: customer.vatNumber,
      notes: customer.notes,
    });
    setShowCustomerForm(true);
  }

  function closeCustomerForm() {
    if (isSavingCustomer) {
      return;
    }

    setShowCustomerForm(false);
    setCustomerError("");
  }

  function updateCustomerForm(
    field: keyof typeof emptyCustomerForm,
    value: string,
  ) {
    setCustomerForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCustomerSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canEditCustomer) {
      setCustomerError(
        "Your account is not authorised to edit this customer.",
      );
      return;
    }

    if (
      !customerForm.contactName.trim() &&
      !customerForm.businessName.trim()
    ) {
      setCustomerError(
        "Enter either a contact name or a business name.",
      );
      return;
    }

    setIsSavingCustomer(true);
    setCustomerError("");

    try {
      const response = await fetch(
        `/api/customers/${customerId}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(customerForm),
        },
      );

      const result = (await response.json()) as {
        customer?: Customer;
        error?: string;
      };

      if (!response.ok || !result.customer) {
        throw new Error(
          result.error || "Unable to update customer.",
        );
      }

      setCustomer(result.customer);
      setShowCustomerForm(false);
    } catch (error) {
      console.error("Unable to update customer:", error);
      setCustomerError(
        error instanceof Error
          ? error.message
          : "Unable to update customer.",
      );
    } finally {
      setIsSavingCustomer(false);
    }
  }

  function updateMachineForm(
    field: keyof typeof emptyMachineForm,
    value: string,
  ) {
    setMachineForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openMachineForm() {
    setMachineError("");
    setShowMachineForm(true);
  }

  function closeMachineForm() {
    if (isSavingMachine) {
      return;
    }

    setShowMachineForm(false);
    setMachineForm(emptyMachineForm);
    setMachineError("");
  }

  async function handleMachineSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !machineForm.make.trim() ||
      !machineForm.model.trim()
    ) {
      setMachineError(
        "Machine make and model are required.",
      );
      return;
    }

    setIsSavingMachine(true);
    setMachineError("");

    const yearValue = machineForm.year.trim()
      ? Number(machineForm.year)
      : null;

    const hoursValue = machineForm.hours.trim()
      ? Number(machineForm.hours)
      : null;

    const estimatedHoursPerWeek = Number(
      machineForm.estimatedHoursPerWeek,
    );

    if (!Number.isFinite(estimatedHoursPerWeek) || estimatedHoursPerWeek < 0) {
      setMachineError("Enter valid estimated hours per week.");
      setIsSavingMachine(false);
      return;
    }

    const { error } = await supabase
      .from("machines")
      .insert({
        company_id: companyId,
        customer_id: customerId,
        make: machineForm.make.trim(),
        model: machineForm.model.trim(),
        machine_type: machineForm.machineType,
        year: yearValue,
        registration:
          machineForm.registration.trim().toUpperCase(),
        serial_number:
          machineForm.serialNumber.trim(),
        hours: hoursValue,
        usage_profile: machineForm.usageProfile,
        estimated_hours_per_week: estimatedHoursPerWeek,
        notes: machineForm.notes.trim(),
      });

    if (error) {
      console.error("Error saving machine:", error);
      setMachineError(
        `Unable to save machine: ${error.message}`,
      );
      setIsSavingMachine(false);
      return;
    }

    await loadMachines();

    setMachineForm(emptyMachineForm);
    setShowMachineForm(false);
    setIsSavingMachine(false);
  }

  if (isLoading) {
    return (
      <main className="p-6 lg:p-8">
        <Card className="p-10 text-center">
          <p className="font-semibold text-slate-700">
            Loading customer...
          </p>
        </Card>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="p-6 lg:p-8">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold">
            Customer not found
          </h1>

          <p className="mt-2 text-slate-500">
            This customer record could not be found.
          </p>

          {pageError && (
            <p className="mt-3 text-sm text-red-700">
              {pageError}
            </p>
          )}

          <Link
            href="/customers"
            className="mt-5 inline-block font-semibold text-[#176b4d] hover:underline"
          >
            ← Back to customers
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6 lg:p-8">
      <Link
        href="/customers"
        className="text-sm font-semibold text-[#176b4d] hover:underline"
      >
        ← Back to customers
      </Link>

      {pageError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#176b4d]">
            Customer profile
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            {customer.businessName}
          </h1>

          <p className="mt-1 text-slate-500">
            {customer.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
            {customer.customerType}
          </span>

          {!isLoadingUser && canEditCustomer && (
            <Button
              variant="secondary"
              onClick={openCustomerForm}
            >
              Edit customer
            </Button>
          )}
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          <h2 className="text-lg font-bold">
            Contact details
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">
                Contact name
              </p>

              <p className="mt-1 font-semibold">
                {customer.name || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Phone
              </p>

              {customer.phone ? (
                <a
                  href={`tel:${customer.phone}`}
                  className="mt-1 block font-semibold text-[#176b4d] hover:underline"
                >
                  {customer.phone}
                </a>
              ) : (
                <p className="mt-1 font-semibold">
                  Not provided
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Email
              </p>

              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="mt-1 block font-semibold text-[#176b4d] hover:underline"
                >
                  {customer.email}
                </a>
              ) : (
                <p className="mt-1 font-semibold">
                  Not provided
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-slate-500">
                VAT number
              </p>

              <p className="mt-1 font-semibold">
                {customer.vatNumber || "Not provided"}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-sm text-slate-500">
                Address
              </p>

              <p className="mt-1 font-semibold">
                {customer.address || "Not provided"}
              </p>

              {customer.postcode && (
                <p className="font-semibold">
                  {customer.postcode}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold">
            Customer summary
          </h2>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Machines
              </p>

              <p className="mt-1 text-2xl font-bold">
                {machines.length}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Open jobs
              </p>

              <p className="mt-1 text-2xl font-bold">
                0
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Outstanding balance
              </p>

              <p className="mt-1 text-2xl font-bold">
                £0.00
              </p>
            </div>
          </div>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold">
              Machines
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Tractors, handlers, implements and other
              equipment belonging to this customer.
            </p>
          </div>

          <Button onClick={openMachineForm}>
            + Add machine
          </Button>
        </div>

        {machines.length === 0 ? (
          <div className="p-6">
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="font-semibold text-slate-700">
                No machines added
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Add the customer&apos;s first tractor,
                handler or implement.
              </p>

              <Button
                className="mt-5"
                onClick={openMachineForm}
              >
                Add first machine
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">
                    Machine
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Type
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Year
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Registration
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Hours
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Serial number
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {machines.map((machine) => (
                  <tr
                    key={machine.id}
                    className="hover:bg-slate-50"
                  >
                <td className="px-6 py-4">
  <Link
    href={`/customers/${customerId}/machines/${machine.id}`}
    className="font-bold text-slate-900 hover:text-[#176b4d] hover:underline"
  >
    {machine.make} {machine.model}
  </Link>

                      {machine.notes && (
                        <p className="mt-1 text-xs text-slate-500">
                          {machine.notes}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {machine.machineType}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {machine.year || "—"}
                    </td>

                    <td className="px-6 py-4">
                      {machine.registration || "—"}
                    </td>

                    <td className="px-6 py-4 font-semibold">
                      {machine.hours
                        ? `${Number(
                            machine.hours,
                          ).toLocaleString()} hrs`
                        : "—"}
                    </td>

                    <td className="px-6 py-4">
                      {machine.serialNumber || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              Open jobs
            </h2>

            <button
              type="button"
              className="text-sm font-semibold text-[#176b4d] hover:underline"
            >
              + Create job
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <p className="font-semibold text-slate-700">
              No open jobs
            </p>

            <p className="mt-1 text-sm text-slate-500">
              New job cards for this customer will appear
              here.
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold">
            Notes
          </h2>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            {customer.notes ||
              "No customer notes have been added."}
          </p>
        </Card>
      </section>


      {showCustomerForm && customer && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 md:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCustomerForm();
            }
          }}
        >
          <Card className="my-4 w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  Edit customer
                </h2>

                <p className="text-sm text-slate-500">
                  Update the customer&apos;s contact and account details.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCustomerForm}
                disabled={isSavingCustomer}
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close customer form"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleCustomerSubmit}
              className="p-6"
            >
              {customerError && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {customerError}
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Contact name
                  <input
                    value={customerForm.contactName}
                    onChange={(event) =>
                      updateCustomerForm(
                        "contactName",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="e.g. Robert Davidson"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Farm or business name
                  <input
                    value={customerForm.businessName}
                    onChange={(event) =>
                      updateCustomerForm(
                        "businessName",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="e.g. R. Davidson & Sons"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Customer type
                  <select
                    value={customerForm.customerType}
                    onChange={(event) =>
                      updateCustomerForm(
                        "customerType",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                  >
                    <option>Farm</option>
                    <option>Contractor</option>
                    <option>Commercial</option>
                    <option>Dealership</option>
                    <option>Private customer</option>
                  </select>
                </label>

                <label className="text-sm font-semibold">
                  Phone number
                  <input
                    type="tel"
                    value={customerForm.phone}
                    onChange={(event) =>
                      updateCustomerForm(
                        "phone",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Email address
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(event) =>
                      updateCustomerForm(
                        "email",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Postcode
                  <input
                    value={customerForm.postcode}
                    onChange={(event) =>
                      updateCustomerForm(
                        "postcode",
                        event.target.value.toUpperCase(),
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal uppercase outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                  />
                </label>

                <label className="text-sm font-semibold md:col-span-2">
                  Address
                  <input
                    value={customerForm.address}
                    onChange={(event) =>
                      updateCustomerForm(
                        "address",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                  />
                </label>

                <label className="text-sm font-semibold">
                  VAT number
                  <input
                    value={customerForm.vatNumber}
                    onChange={(event) =>
                      updateCustomerForm(
                        "vatNumber",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal uppercase outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                  />
                </label>

                <label className="text-sm font-semibold md:col-span-2">
                  Customer notes
                  <textarea
                    rows={4}
                    value={customerForm.notes}
                    onChange={(event) =>
                      updateCustomerForm(
                        "notes",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={closeCustomerForm}
                  disabled={isSavingCustomer}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSavingCustomer}
                >
                  {isSavingCustomer
                    ? "Saving changes..."
                    : "Save changes"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {showMachineForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 md:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeMachineForm();
            }
          }}
        >
          <Card className="my-4 w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  Add machine
                </h2>

                <p className="text-sm text-slate-500">
                  Add equipment belonging to{" "}
                  {customer.businessName}.
                </p>
              </div>

              <button
                type="button"
                onClick={closeMachineForm}
                disabled={isSavingMachine}
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close machine form"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleMachineSubmit}
              className="p-6"
            >
              {machineError && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {machineError}
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Make *
                  <input
                    required
                    value={machineForm.make}
                    onChange={(event) =>
                      updateMachineForm(
                        "make",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="e.g. New Holland"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Model *
                  <input
                    required
                    value={machineForm.model}
                    onChange={(event) =>
                      updateMachineForm(
                        "model",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="e.g. T7.245"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Machine type
                  <select
                    value={machineForm.machineType}
                    onChange={(event) =>
                      updateMachineForm(
                        "machineType",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                  >
                    <option>Tractor</option>
                    <option>Telehandler</option>
                    <option>Loader</option>
                    <option>Excavator</option>
                    <option>Combine</option>
                    <option>Forage harvester</option>
                    <option>Implement</option>
                    <option>Trailer</option>
                    <option>Dairy equipment</option>
                    <option>Other</option>
                  </select>
                </label>

                <label className="text-sm font-semibold">
                  Year
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={machineForm.year}
                    onChange={(event) =>
                      updateMachineForm(
                        "year",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="e.g. 2020"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Registration
                  <input
                    value={machineForm.registration}
                    onChange={(event) =>
                      updateMachineForm(
                        "registration",
                        event.target.value.toUpperCase(),
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal uppercase outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="e.g. ABZ 1234"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Serial number
                  <input
                    value={machineForm.serialNumber}
                    onChange={(event) =>
                      updateMachineForm(
                        "serialNumber",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="Machine serial or VIN"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Current hours
                  <input
                    type="number"
                    min="0"
                    value={machineForm.hours}
                    onChange={(event) =>
                      updateMachineForm(
                        "hours",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="e.g. 4385"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Usage level
                  <select
                    value={machineForm.usageProfile}
                    onChange={(event) => {
                      const profile = event.target.value as
                        | "light"
                        | "medium"
                        | "heavy";
                      setMachineForm((current) => ({
                        ...current,
                        usageProfile: profile,
                        estimatedHoursPerWeek:
                          profile === "light"
                            ? "10"
                            : profile === "heavy"
                              ? "50"
                              : "25",
                      }));
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                  >
                    <option value="light">Light usage</option>
                    <option value="medium">Medium usage</option>
                    <option value="heavy">Heavy usage</option>
                  </select>
                </label>

                <label className="text-sm font-semibold">
                  Estimated hours per week
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={machineForm.estimatedHoursPerWeek}
                    onChange={(event) =>
                      updateMachineForm(
                        "estimatedHoursPerWeek",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                  />
                </label>

                <label className="text-sm font-semibold md:col-span-2">
                  Machine notes
                  <textarea
                    rows={4}
                    value={machineForm.notes}
                    onChange={(event) =>
                      updateMachineForm(
                        "notes",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="Specifications, attachments, known faults or service information..."
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={closeMachineForm}
                  disabled={isSavingMachine}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSavingMachine}
                >
                  {isSavingMachine
                    ? "Saving machine..."
                    : "Save machine"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </main>
  );
}