"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import Card from "../../Components/ui/Card";

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

export default function MachinesPage() {
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
  }, []);

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
      const matchesSearch =
        normalisedSearch === "" ||
        machine.make
          .toLowerCase()
          .includes(normalisedSearch) ||
        machine.model
          .toLowerCase()
          .includes(normalisedSearch) ||
        machine.registration
          .toLowerCase()
          .includes(normalisedSearch) ||
        machine.serialNumber
          .toLowerCase()
          .includes(normalisedSearch) ||
        machine.customerName
          .toLowerCase()
          .includes(normalisedSearch);

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
          return (
            Number(b.hours || 0) -
            Number(a.hours || 0)
          );

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
    <main className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#176b4d]">
            Equipment register
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Machines
          </h1>

          <p className="mt-1 text-slate-500">
            Search and view all customer machinery and
            equipment.
          </p>
        </div>

        <div className="w-fit rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total machines
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {machines.length}
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <Card className="p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_auto] lg:items-end">
          <label className="text-sm font-semibold text-slate-700">
            Search machines
            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Make, model, reg, serial number or customer..."
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Machine type
            <select
              value={machineTypeFilter}
              onChange={(event) =>
                setMachineTypeFilter(event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
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

          <label className="text-sm font-semibold text-slate-700">
            Sort by
            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(
                  event.target.value as SortOption,
                )
              }
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-normal outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/10"
            >
              <option value="newest">
                Newest added
              </option>

              <option value="make">
                Make and model
              </option>

              <option value="customer">
                Customer
              </option>

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
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {filteredMachines.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-800">
              {machines.length}
            </span>{" "}
            machines
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-700">
              Loading machines...
            </p>
          </div>
        ) : machines.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-700">
              No machines found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Machines added through customer profiles will
              appear here.
            </p>
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-700">
              No matching machines
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search term or machine type
              filter.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 font-semibold text-[#176b4d] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">
                    Machine
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Customer
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
                    Serial number
                  </th>

                  <th className="px-6 py-3 font-semibold">
                    Hours
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredMachines.map((machine) => (
                  <tr
                    key={machine.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/customers/${machine.customerId}/machines/${machine.id}`}
                        className="font-bold text-slate-900 hover:text-[#176b4d] hover:underline"
                      >
                        {machine.make} {machine.model}
                      </Link>
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        href={`/customers/${machine.customerId}`}
                        className="font-semibold text-[#176b4d] hover:underline"
                      >
                        {machine.customerName}
                      </Link>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {machine.machineType}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {machine.year || "—"}
                    </td>

                    <td className="px-6 py-4 font-semibold">
                      {machine.registration || "—"}
                    </td>

                    <td className="px-6 py-4">
                      {machine.serialNumber || "—"}
                    </td>

                    <td className="px-6 py-4 font-semibold">
                      {machine.hours
                        ? `${Number(
                            machine.hours,
                          ).toLocaleString()} hrs`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}