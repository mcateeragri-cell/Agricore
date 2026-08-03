"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import Button from "../../Components/ui/Button";
import Card from "../../Components/ui/Card";

type Customer = {
  id: string | number;
  name: string;
  businessName: string;
  customerType: string;
  phone: string;
  email: string;
  address: string;
  postcode: string;
  vatNumber: string;
  notes: string;
  machines: number;
  openJobs: number;
};

type CompanyContextResponse = {
  activeCompany?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  error?: string;
};

const emptyForm = {
  name: "",
  businessName: "",
  customerType: "Farm",
  phone: "",
  email: "",
  address: "",
  postcode: "",
  vatNumber: "",
  notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const contextResponse = await fetch(
        "/api/auth/company-context",
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        },
      );

      const context =
        (await contextResponse.json()) as CompanyContextResponse;

      if (!contextResponse.ok) {
        throw new Error(
          context.error ||
            "Unable to load the active company.",
        );
      }

      const companyId =
        context.activeCompany?.id?.trim() ?? "";

      if (!companyId) {
        throw new Error(
          "No active company is available for this account.",
        );
      }

      setActiveCompanyId(companyId);

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("company_id", companyId)
        .order("business_name", {
          ascending: true,
        });

      if (error) {
        throw new Error(error.message);
      }

      const loadedCustomers: Customer[] = (data ?? []).map(
        (customer) => ({
          id: customer.id,
          name: customer.contact_name ?? "",
          businessName: customer.business_name ?? "",
          customerType: customer.customer_type ?? "Farm",
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          address: customer.address ?? "",
          postcode: customer.postcode ?? "",
          vatNumber: customer.vat_number ?? "",
          notes: customer.notes ?? "",
          machines: 0,
          openJobs: 0,
        }),
      );

      setCustomers(loadedCustomers);
    } catch (error) {
      console.error("Error loading customers:", error);

      setCustomers([]);
      setErrorMessage(
        error instanceof Error
          ? `Unable to load customers: ${error.message}`
          : "Unable to load customers.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        customer.name,
        customer.businessName,
        customer.phone,
        customer.email,
        customer.address,
        customer.postcode,
      ].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [customers, search]);

  const totalMachines = customers.reduce(
    (total, customer) => total + customer.machines,
    0,
  );

  const totalOpenJobs = customers.reduce(
    (total, customer) => total + customer.openJobs,
    0,
  );

  function updateForm(
    field: keyof typeof emptyForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setShowForm(false);
    setForm(emptyForm);
    setErrorMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.businessName.trim()
    ) {
      setErrorMessage(
        "Contact name and business name are required.",
      );
      return;
    }

    if (!activeCompanyId) {
      setErrorMessage(
        "No active company is selected. Refresh the page and try again.",
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("customers")
      .insert({
        company_id: activeCompanyId,
        contact_name: form.name.trim(),
        business_name: form.businessName.trim(),
        customer_type: form.customerType,
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        postcode: form.postcode.trim().toUpperCase(),
        vat_number: form.vatNumber.trim(),
        notes: form.notes.trim(),
      });

    if (error) {
      console.error("Error saving customer:", error);
      setErrorMessage(
        `Unable to save customer: ${error.message}`,
      );
      setIsSaving(false);
      return;
    }

    await loadCustomers();

    setForm(emptyForm);
    setShowForm(false);
    setIsSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-4 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Customer relationship management
            </p>

            <h1 className="text-2xl font-bold">
              Customers
            </h1>
          </div>

          <Button
            onClick={() => {
              setErrorMessage("");
              setShowForm(true);
            }}
          >
            + Add customer
          </Button>
        </div>
      </header>

      <div className="p-5 md:p-8">
        {errorMessage && !showForm && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm font-medium text-slate-500">
              Total customers
            </p>

            <p className="mt-3 text-3xl font-bold">
              {customers.length}
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-medium text-slate-500">
              Registered machines
            </p>

            <p className="mt-3 text-3xl font-bold">
              {totalMachines}
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-medium text-slate-500">
              Open customer jobs
            </p>

            <p className="mt-3 text-3xl font-bold">
              {totalOpenJobs}
            </p>
          </Card>
        </section>

        <Card className="mt-6 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-bold">
                Customer directory
              </h2>

              <p className="text-sm text-slate-500">
                Farms, contractors and commercial customers
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search customers..."
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10 md:max-w-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    Customer
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Type
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Contact
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Location
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Machines
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Open jobs
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Loading customers...
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-bold text-slate-900 hover:text-[#176b4d] hover:underline"
                        >
                          {customer.businessName}
                        </Link>

                        <p className="mt-1 text-xs text-slate-500">
                          {customer.name}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {customer.customerType}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p>
                          {customer.phone ||
                            "No phone supplied"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {customer.email ||
                            "No email supplied"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p>
                          {customer.address ||
                            "No address supplied"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {customer.postcode}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {customer.machines}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            customer.openJobs > 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {customer.openJobs}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-semibold text-[#176b4d] hover:underline"
                        >
                          View customer
                        </Link>
                      </td>
                    </tr>
                  ))}

                {!isLoading &&
                  filteredCustomers.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-slate-500"
                      >
                        {customers.length === 0
                          ? "No customers have been added yet."
                          : "No customers match your search."}
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 md:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <Card className="my-4 w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  Add new customer
                </h2>

                <p className="text-sm text-slate-500">
                  Create a farm, contractor or business
                  record.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close customer form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {errorMessage && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Contact name *
                  <input
                    required
                    value={form.name}
                    onChange={(event) =>
                      updateForm(
                        "name",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="e.g. Robert Davidson"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Farm or business name *
                  <input
                    required
                    value={form.businessName}
                    onChange={(event) =>
                      updateForm(
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
                    value={form.customerType}
                    onChange={(event) =>
                      updateForm(
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
                    value={form.phone}
                    onChange={(event) =>
                      updateForm(
                        "phone",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="e.g. 07700 900123"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Email address
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateForm(
                        "email",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="customer@example.com"
                  />
                </label>

                <label className="text-sm font-semibold">
                  Postcode
                  <input
                    value={form.postcode}
                    onChange={(event) =>
                      updateForm(
                        "postcode",
                        event.target.value.toUpperCase(),
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal uppercase outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="BT32 4AA"
                  />
                </label>

                <label className="text-sm font-semibold md:col-span-2">
                  Address
                  <input
                    value={form.address}
                    onChange={(event) =>
                      updateForm(
                        "address",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="Farm or business address"
                  />
                </label>

                <label className="text-sm font-semibold">
                  VAT number
                  <input
                    value={form.vatNumber}
                    onChange={(event) =>
                      updateForm(
                        "vatNumber",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="GB 123 4567 89"
                  />
                </label>

                <label className="text-sm font-semibold md:col-span-2">
                  Customer notes
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      updateForm(
                        "notes",
                        event.target.value,
                      )
                    }
                    rows={4}
                    className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
                    placeholder="Machine details, payment terms, site instructions or other notes..."
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={closeForm}
                  disabled={isSaving}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving customer..."
                    : "Save customer"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </main>
  );
}