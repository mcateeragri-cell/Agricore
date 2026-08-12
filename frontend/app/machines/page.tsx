"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Card from "../../Components/ui/Card";
import { supabase } from "@/lib/supabase";
import { useNavigationUser } from "@/Components/navigation/use-navigation-user";

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
  customerName: string;
  createdAt: string;
};

type SortOption =
  | "newest"
  | "make"
  | "customer"
  | "year-newest"
  | "hours-highest";


function getMissingMachineDetails(machine: Machine) {
  const missing: string[] = [];
  if (!machine.year.trim()) missing.push("year");
  if (!machine.registration.trim() && !machine.serialNumber.trim()) missing.push("reg / serial");
  if (!machine.hours.trim()) missing.push("hours");
  return missing;
}

function formatHours(hours: string) {
  if (!hours) return "—";

  const value = Number(hours);

  if (Number.isNaN(value)) {
    return `${hours} hrs`;
  }

  return `${value.toLocaleString("en-GB")} hrs`;
}

function MachineMeta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
        {label}
      </p>

      <div className="mt-1 break-words text-base font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

export default function MachinesPage() {
  const { userState, loading: companyLoading } = useNavigationUser();
  const companyId = userState.activeCompany?.id ?? "";
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [machineTypeFilter, setMachineTypeFilter] =
    useState("All");
  const [sortOption, setSortOption] =
    useState<SortOption>("newest");

  const loadMachines = useCallback(async () => {
    setIsLoading(true);

    if (!companyId) {
      setMachines([]);
      setIsLoading(companyLoading);
      return;
    }
    setErrorMessage("");

    const { data, error } = await supabase
      .from("machines")
      .select(`
        id,
        customer_id,
        make,
        model,
        machine_type,
        year,
        registration,
        serial_number,
        hours,
        created_at,
        customers (
          business_name,
          contact_name
        )
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading machines:", error);

      setErrorMessage(
        `Unable to load machines: ${error.message}`,
      );

      setIsLoading(false);
      return;
    }

    const loadedMachines: Machine[] = (data ?? []).map(
      (machine) => {
        const relatedCustomer = Array.isArray(
          machine.customers,
        )
          ? machine.customers[0]
          : machine.customers;

        return {
          id: machine.id,
          customerId: machine.customer_id,
          make: machine.make ?? "",
          model: machine.model ?? "",
          machineType:
            machine.machine_type ?? "Other",
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
          customerName:
            relatedCustomer?.business_name ||
            relatedCustomer?.contact_name ||
            "Unknown customer",
          createdAt: machine.created_at ?? "",
        };
      },
    );

    setMachines(loadedMachines);
    setIsLoading(false);
  }, [companyId, companyLoading]);

  useEffect(() => {
    void loadMachines();
  }, [loadMachines]);

  const machineTypes = useMemo(() => {
    const types = machines
      .map((machine) => machine.machineType)
      .filter(Boolean);

    return ["All", ...Array.from(new Set(types)).sort()];
  }, [machines]);

  const filteredMachines = useMemo(() => {
    const normalisedSearch = searchTerm
      .trim()
      .toLowerCase();

    const filtered = machines.filter((machine) => {
      const searchableText = [
        machine.make,
        machine.model,
        machine.registration,
        machine.serialNumber,
        machine.customerName,
        machine.machineType,
        machine.year,
        machine.hours,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalisedSearch === "" ||
        searchableText.includes(normalisedSearch);

      const matchesType =
        machineTypeFilter === "All" ||
        machine.machineType === machineTypeFilter;

      return matchesSearch && matchesType;
    });

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "make":
          return `${a.make} ${a.model}`.localeCompare(
            `${b.make} ${b.model}`,
          );

        case "customer":
          return a.customerName.localeCompare(
            b.customerName,
          );

        case "year-newest":
          return Number(b.year || 0) - Number(a.year || 0);

        case "hours-highest":
          return Number(b.hours || 0) - Number(a.hours || 0);

        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
          );
      }
    });
  }, [
    machines,
    searchTerm,
    machineTypeFilter,
    sortOption,
  ]);

  function clearFilters() {
    setSearchTerm("");
    setMachineTypeFilter("All");
    setSortOption("newest");
  }

  const filtersAreActive =
    searchTerm.trim() !== "" ||
    machineTypeFilter !== "All" ||
    sortOption !== "newest";

  return (
    <div className="w-full min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
            Equipment register
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Machines
          </h1>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-700 sm:text-base">
            Search and view all customer machinery and
            equipment.
          </p>
        </div>

        <div className="w-fit rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
            Total machines
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {machines.length}
          </p>
        </div>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
        >
          {errorMessage}
        </div>
      )}

      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto] lg:items-end">
          <label className="text-sm font-bold text-slate-800">
            Search machines
            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Make, model, reg, serial number or customer..."
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-900 outline-none placeholder:text-slate-500 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            />
          </label>

          <label className="text-sm font-bold text-slate-800">
            Machine type
            <select
              value={machineTypeFilter}
              onChange={(event) =>
                setMachineTypeFilter(event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            >
              {machineTypes.map((machineType) => (
                <option
                  key={machineType}
                  value={machineType}
                >
                  {machineType}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-bold text-slate-800">
            Sort by
            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(
                  event.target.value as SortOption,
                )
              }
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            >
              <option value="newest">Newest added</option>
              <option value="make">Make and model</option>
              <option value="customer">Customer</option>
              <option value="year-newest">
                Year: newest first
              </option>
              <option value="hours-highest">
                Hours: highest first
              </option>
            </select>
          </label>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!filtersAreActive}
            className="min-h-11 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-sm font-medium text-slate-700">
            Showing{" "}
            <span className="font-bold text-slate-900">
              {filteredMachines.length}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-900">
              {machines.length}
            </span>{" "}
            machines
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <p className="font-bold text-slate-800">
              Loading machines...
            </p>
          </div>
        ) : machines.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-bold text-slate-800">
              No machines found
            </p>

            <p className="mt-2 text-sm font-medium text-slate-700">
              Machines added through customer profiles will
              appear here.
            </p>
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-bold text-slate-800">
              No matching machines
            </p>

            <p className="mt-2 text-sm font-medium text-slate-700">
              Try changing your search term or machine type
              filter.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 font-bold text-emerald-700 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-200 lg:hidden">
              {filteredMachines.map((machine) => (
                <article
                  key={machine.id}
                  className="space-y-5 p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/customers/${machine.customerId}/machines/${machine.id}`}
                        className="block break-words text-lg font-bold text-slate-900 hover:text-emerald-700 hover:underline"
                      >
                        {[machine.make, machine.model]
                          .filter(Boolean)
                          .join(" ") || "Unnamed machine"}
                      </Link>

                      <Link
                        href={`/customers/${machine.customerId}`}
                        className="mt-1 block break-words text-sm font-bold text-emerald-700 hover:underline"
                      >
                        {machine.customerName}
                      </Link>
                      {getMissingMachineDetails(machine).length > 0 && (
                        <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                          Details incomplete · {getMissingMachineDetails(machine).join(", ")}
                        </span>
                      )}
                    </div>

                    <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                      {machine.machineType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <MachineMeta
                      label="Year"
                      value={machine.year || "—"}
                    />

                    <MachineMeta
                      label="Registration"
                      value={machine.registration || "—"}
                    />

                    <MachineMeta
                      label="Hours"
                      value={formatHours(machine.hours)}
                    />

                    <MachineMeta
                      label="Serial number"
                      value={machine.serialNumber || "—"}
                    />
                  </div>

                  <Link
                    href={`/customers/${machine.customerId}/machines/${machine.id}`}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 sm:w-auto"
                  >
                    View machine
                  </Link>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[950px] text-left">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-700">
                  <tr>
                    <th className="px-6 py-3 font-bold">
                      Machine
                    </th>
                    <th className="px-6 py-3 font-bold">
                      Customer
                    </th>
                    <th className="px-6 py-3 font-bold">
                      Type
                    </th>
                    <th className="px-6 py-3 font-bold">
                      Year
                    </th>
                    <th className="px-6 py-3 font-bold">
                      Registration
                    </th>
                    <th className="px-6 py-3 font-bold">
                      Serial number
                    </th>
                    <th className="px-6 py-3 font-bold">
                      Hours
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-[15px] text-slate-900">
                  {filteredMachines.map((machine) => (
                    <tr
                      key={machine.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/customers/${machine.customerId}/machines/${machine.id}`}
                          className="font-bold text-slate-900 hover:text-emerald-700 hover:underline"
                        >
                          {[machine.make, machine.model]
                            .filter(Boolean)
                            .join(" ") || "Unnamed machine"}
                        </Link>
                        {getMissingMachineDetails(machine).length > 0 && (
                          <div className="mt-2">
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                              Details incomplete
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/customers/${machine.customerId}`}
                          className="font-bold text-emerald-700 hover:underline"
                        >
                          {machine.customerName}
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                          {machine.machineType}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-900">
                        {machine.year || "—"}
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-900">
                        {machine.registration || "—"}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {machine.serialNumber || "—"}
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-900">
                        {formatHours(machine.hours)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}