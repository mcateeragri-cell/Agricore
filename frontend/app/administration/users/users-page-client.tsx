"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AppRole =
  | "administrator"
  | "service_manager"
  | "office"
  | "parts_manager"
  | "technician"
  | "apprentice"
  | "read_only";

type StaffUser = {
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  job_title: string | null;
  role: AppRole | null;
  is_active: boolean;
  calendar_colour: string | null;
  hourly_cost: number | null;
  charge_out_rate: number | null;
  contracted_hours_per_week: number | null;
  holiday_entitlement_days: number | null;
  notes: string | null;
  qualification_count: number;
  created_at: string;
  updated_at: string;
};

type Qualification = {
  id: string;
  qualification_name: string;
  issuing_body: string | null;
  certificate_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  document_url: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

type StaffUserDetail = StaffUser & {
  qualifications: Qualification[];
};

type PermissionState = {
  canView: boolean;
  canManageTechnicians: boolean;
  canManageAll: boolean;
};

type UserFormState = {
  full_name: string;
  phone: string;
  job_title: string;
  role: AppRole;
  is_active: boolean;
  calendar_colour: string;
  hourly_cost: string;
  charge_out_rate: string;
  contracted_hours_per_week: string;
  holiday_entitlement_days: string;
  notes: string;
};

type CreateUserFormState = UserFormState & {
  email: string;
  temporary_password: string;
};

type QualificationFormState = {
  id: string | null;
  qualification_name: string;
  issuing_body: string;
  certificate_number: string;
  issued_date: string;
  expiry_date: string;
  document_url: string;
  notes: string;
};

const ROLE_OPTIONS: Array<{
  value: AppRole;
  label: string;
}> = [
  { value: "administrator", label: "Administrator" },
  { value: "service_manager", label: "Service Manager" },
  { value: "office", label: "Office" },
  { value: "parts_manager", label: "Parts Manager" },
  { value: "technician", label: "Technician" },
  { value: "apprentice", label: "Apprentice" },
  { value: "read_only", label: "Read Only" },
];

const EMPTY_USER_FORM: UserFormState = {
  full_name: "",
  phone: "",
  job_title: "",
  role: "technician",
  is_active: true,
  calendar_colour: "#103d2e",
  hourly_cost: "",
  charge_out_rate: "",
  contracted_hours_per_week: "",
  holiday_entitlement_days: "",
  notes: "",
};

const EMPTY_CREATE_FORM: CreateUserFormState = {
  ...EMPTY_USER_FORM,
  email: "",
  temporary_password: "",
};

const EMPTY_QUALIFICATION_FORM: QualificationFormState = {
  id: null,
  qualification_name: "",
  issuing_body: "",
  certificate_number: "",
  issued_date: "",
  expiry_date: "",
  document_url: "",
  notes: "",
};

function formatRole(role: AppRole | null): string {
  if (!role) return "No role";

  return (
    ROLE_OPTIONS.find((option) => option.value === role)?.label ??
    role.replaceAll("_", " ")
  );
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function numberOrEmpty(value: number | null): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export default function UsersPageClient() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [permissions, setPermissions] = useState<PermissionState>({
    canView: false,
    canManageTechnicians: false,
    canManageAll: false,
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [selectedUser, setSelectedUser] =
    useState<StaffUserDetail | null>(null);
  const [editForm, setEditForm] =
    useState<UserFormState>(EMPTY_USER_FORM);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateUserFormState>(EMPTY_CREATE_FORM);

  const [qualificationModalOpen, setQualificationModalOpen] =
    useState(false);
  const [qualificationForm, setQualificationForm] =
    useState<QualificationFormState>(EMPTY_QUALIFICATION_FORM);

  const canManageUser = useCallback(
    (user: StaffUser | StaffUserDetail): boolean => {
      if (permissions.canManageAll) return true;

      return (
        permissions.canManageTechnicians &&
        (user.role === "technician" || user.role === "apprentice")
      );
    },
    [permissions],
  );

  const allowedCreateRoles = useMemo(() => {
    if (permissions.canManageAll) return ROLE_OPTIONS;

    if (permissions.canManageTechnicians) {
      return ROLE_OPTIONS.filter(
        (option) =>
          option.value === "technician" ||
          option.value === "apprentice",
      );
    }

    return [];
  }, [permissions]);

  const filteredUsers = useMemo(() => {
    const normalisedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalisedSearch ||
        user.full_name.toLowerCase().includes(normalisedSearch) ||
        user.email.toLowerCase().includes(normalisedSearch) ||
        user.phone?.toLowerCase().includes(normalisedSearch) ||
        user.job_title?.toLowerCase().includes(normalisedSearch);

      const matchesRole =
        roleFilter === "all" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.is_active).length,
      technicians: users.filter(
        (user) =>
          user.role === "technician" ||
          user.role === "apprentice",
      ).length,
      expiringQualifications: users.reduce(
        (total, user) => total + Number(user.qualification_count || 0),
        0,
      ),
    };
  }, [users]);

  const loadPermissions = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("You must be signed in.");

    setCurrentUserId(user.id);

    const { data: roleRecord, error: roleError } = await supabase
      .from("app_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) throw roleError;
    if (!roleRecord?.role) {
      throw new Error("Your account does not have an application role.");
    }

    const { data: permissionRecords, error: permissionError } =
      await supabase
        .from("app_role_permissions")
        .select("permission_key, allowed")
        .eq("role", roleRecord.role)
        .in("permission_key", [
          "users.view",
          "users.manage_technicians",
          "users.manage_all",
        ]);

    if (permissionError) throw permissionError;

    const allowed = new Set(
      (permissionRecords ?? [])
        .filter((record) => record.allowed)
        .map((record) => record.permission_key),
    );

    const nextPermissions = {
      canView: allowed.has("users.view"),
      canManageTechnicians: allowed.has(
        "users.manage_technicians",
      ),
      canManageAll: allowed.has("users.manage_all"),
    };

    setPermissions(nextPermissions);

    if (!nextPermissions.canView) {
      throw new Error(
        "You do not have permission to view User Administration.",
      );
    }
  }, []);

  const loadUsers = useCallback(async () => {
    const { data, error: listError } = await supabase.rpc(
      "list_staff_users",
    );

    if (listError) throw listError;

    setUsers((data ?? []) as StaffUser[]);
  }, []);

  const initialisePage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await loadPermissions();
      await loadUsers();
    } catch (initialiseError) {
      setError(errorMessage(initialiseError));
    } finally {
      setLoading(false);
    }
  }, [loadPermissions, loadUsers]);

  useEffect(() => {
    void initialisePage();
  }, [initialisePage]);

  async function openUser(userId: string) {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const { data, error: detailError } = await supabase.rpc(
        "get_staff_user",
        {
          p_target_user_id: userId,
        },
      );

      if (detailError) throw detailError;
      if (!data) throw new Error("Staff member not found.");

      const detail = data as StaffUserDetail;

      setSelectedUser({
        ...detail,
        qualifications: Array.isArray(detail.qualifications)
          ? detail.qualifications
          : [],
      });

      setEditForm({
        full_name: detail.full_name ?? "",
        phone: detail.phone ?? "",
        job_title: detail.job_title ?? "",
        role: detail.role ?? "technician",
        is_active: detail.is_active,
        calendar_colour: detail.calendar_colour ?? "#103d2e",
        hourly_cost: numberOrEmpty(detail.hourly_cost),
        charge_out_rate: numberOrEmpty(detail.charge_out_rate),
        contracted_hours_per_week: numberOrEmpty(
          detail.contracted_hours_per_week,
        ),
        holiday_entitlement_days: numberOrEmpty(
          detail.holiday_entitlement_days,
        ),
        notes: detail.notes ?? "",
      });

      setEditModalOpen(true);
    } catch (openError) {
      setError(errorMessage(openError));
    } finally {
      setSaving(false);
    }
  }

  async function refreshSelectedUser() {
    if (!selectedUser) return;

    const { data, error: detailError } = await supabase.rpc(
      "get_staff_user",
      {
        p_target_user_id: selectedUser.user_id,
      },
    );

    if (detailError) throw detailError;
    if (!data) throw new Error("Staff member not found.");

    const detail = data as StaffUserDetail;

    setSelectedUser({
      ...detail,
      qualifications: Array.isArray(detail.qualifications)
        ? detail.qualifications
        : [],
    });
  }

  async function handleUpdateUser(event: FormEvent) {
    event.preventDefault();

    if (!selectedUser) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase.rpc(
        "update_staff_user",
        {
          p_target_user_id: selectedUser.user_id,
          p_profile_changes: {
            full_name: editForm.full_name,
            phone: editForm.phone,
            job_title: editForm.job_title,
            is_active: editForm.is_active,
            calendar_colour: editForm.calendar_colour,
            hourly_cost: editForm.hourly_cost,
            charge_out_rate: editForm.charge_out_rate,
            contracted_hours_per_week:
              editForm.contracted_hours_per_week,
            holiday_entitlement_days:
              editForm.holiday_entitlement_days,
            notes: editForm.notes,
          },
          p_requested_role: editForm.role,
        },
      );

      if (updateError) throw updateError;

      await Promise.all([loadUsers(), refreshSelectedUser()]);

      setSuccess("Staff member updated successfully.");
    } catch (updateError) {
      setError(errorMessage(updateError));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(user: StaffUser) {
    const action = user.is_active ? "deactivate" : "reactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${user.full_name}?`,
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: statusError } = await supabase.rpc(
        "set_staff_user_active_status",
        {
          p_target_user_id: user.user_id,
          p_requested_active_status: !user.is_active,
        },
      );

      if (statusError) throw statusError;

      await loadUsers();

      if (selectedUser?.user_id === user.user_id) {
        await refreshSelectedUser();
      }

      setSuccess(
        `${user.full_name} has been ${
          user.is_active ? "deactivated" : "reactivated"
        }.`,
      );
    } catch (statusError) {
      setError(errorMessage(statusError));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateUser(event: FormEvent) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.access_token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch("/api/administration/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(createForm),
      });

      const result = (await response.json()) as {
        error?: string;
        user_id?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create user.");
      }

      await loadUsers();

      setCreateModalOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);
      setSuccess("New staff account created successfully.");
    } catch (createError) {
      setError(errorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  function openNewQualification() {
    setQualificationForm(EMPTY_QUALIFICATION_FORM);
    setQualificationModalOpen(true);
  }

  function openEditQualification(qualification: Qualification) {
    setQualificationForm({
      id: qualification.id,
      qualification_name:
        qualification.qualification_name ?? "",
      issuing_body: qualification.issuing_body ?? "",
      certificate_number:
        qualification.certificate_number ?? "",
      issued_date: qualification.issued_date ?? "",
      expiry_date: qualification.expiry_date ?? "",
      document_url: qualification.document_url ?? "",
      notes: qualification.notes ?? "",
    });

    setQualificationModalOpen(true);
  }

  async function handleSaveQualification(event: FormEvent) {
    event.preventDefault();

    if (!selectedUser) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: qualificationError } = await supabase.rpc(
        "save_staff_qualification",
        {
          p_qualification_id: qualificationForm.id,
          p_target_user_id: selectedUser.user_id,
          p_qualification_data: {
            qualification_name:
              qualificationForm.qualification_name,
            issuing_body: qualificationForm.issuing_body,
            certificate_number:
              qualificationForm.certificate_number,
            issued_date: qualificationForm.issued_date,
            expiry_date: qualificationForm.expiry_date,
            document_url: qualificationForm.document_url,
            notes: qualificationForm.notes,
          },
        },
      );

      if (qualificationError) throw qualificationError;

      await Promise.all([refreshSelectedUser(), loadUsers()]);

      setQualificationModalOpen(false);
      setQualificationForm(EMPTY_QUALIFICATION_FORM);
      setSuccess("Qualification saved successfully.");
    } catch (qualificationError) {
      setError(errorMessage(qualificationError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQualification(
    qualification: Qualification,
  ) {
    const confirmed = window.confirm(
      `Delete "${qualification.qualification_name}"?`,
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: deleteError } = await supabase.rpc(
        "delete_staff_qualification",
        {
          p_qualification_id: qualification.id,
        },
      );

      if (deleteError) throw deleteError;

      await Promise.all([refreshSelectedUser(), loadUsers()]);

      setSuccess("Qualification deleted.");
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  }

  function openCreateModal() {
    const defaultRole =
      allowedCreateRoles[0]?.value ?? "technician";

    setCreateForm({
      ...EMPTY_CREATE_FORM,
      role: defaultRole,
    });

    setCreateModalOpen(true);
    setError("");
    setSuccess("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-600">
              Loading User Administration…
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!permissions.canView) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Access denied
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {error ||
              "You do not have permission to view User Administration."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Administration
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              Users
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage staff profiles, roles, rates and qualifications.
            </p>
          </div>

          {(permissions.canManageAll ||
            permissions.canManageTechnicians) && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900"
            >
              Add staff member
            </button>
          )}
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total staff"
            value={summary.total}
          />
          <SummaryCard
            label="Active staff"
            value={summary.active}
          />
          <SummaryCard
            label="Technical staff"
            value={summary.technicians}
          />
          <SummaryCard
            label="Qualifications"
            value={summary.expiringQualifications}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_220px_180px]">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, email, phone or job title…"
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target.value as "all" | AppRole,
                )
              }
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All roles</option>
              {ROLE_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "all"
                    | "active"
                    | "inactive",
                )
              }
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <TableHeading>Staff member</TableHeading>
                  <TableHeading>Role</TableHeading>
                  <TableHeading>Job title</TableHeading>
                  <TableHeading>Charge rate</TableHeading>
                  <TableHeading>Qualifications</TableHeading>
                  <TableHeading>Status</TableHeading>
                  <TableHeading align="right">
                    Actions
                  </TableHeading>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.user_id}
                    className="hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar user={user} />

                        <div>
                          <button
                            type="button"
                            onClick={() => void openUser(user.user_id)}
                            className="text-left text-sm font-semibold text-slate-900 hover:text-emerald-800"
                          >
                            {user.full_name}
                          </button>
                          <p className="text-xs text-slate-500">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                      {formatRole(user.role)}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {user.job_title || "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                      {formatCurrency(user.charge_out_rate)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                      {user.qualification_count}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <StatusBadge active={user.is_active} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void openUser(user.user_id)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </button>

                        {canManageUser(user) && (
                          <button
                            type="button"
                            disabled={
                              saving ||
                              (user.user_id === currentUserId &&
                                user.is_active)
                            }
                            onClick={() =>
                              void handleToggleActive(user)
                            }
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {user.is_active
                              ? "Deactivate"
                              : "Reactivate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-200 lg:hidden">
            {filteredUsers.map((user) => (
              <article
                key={user.user_id}
                className="space-y-4 p-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar user={user} />

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => void openUser(user.user_id)}
                      className="truncate text-left text-sm font-semibold text-slate-900"
                    >
                      {user.full_name}
                    </button>

                    <p className="truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>

                  <StatusBadge active={user.is_active} />
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <DataItem
                    label="Role"
                    value={formatRole(user.role)}
                  />
                  <DataItem
                    label="Job title"
                    value={user.job_title || "—"}
                  />
                  <DataItem
                    label="Charge rate"
                    value={formatCurrency(user.charge_out_rate)}
                  />
                  <DataItem
                    label="Qualifications"
                    value={String(user.qualification_count)}
                  />
                </dl>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void openUser(user.user_id)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    View profile
                  </button>

                  {canManageUser(user) && (
                    <button
                      type="button"
                      disabled={
                        saving ||
                        (user.user_id === currentUserId &&
                          user.is_active)
                      }
                      onClick={() => void handleToggleActive(user)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
                    >
                      {user.is_active
                        ? "Deactivate"
                        : "Reactivate"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                No staff members found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Adjust the search or filter options.
              </p>
            </div>
          )}
        </section>
      </div>

      {createModalOpen && (
        <Modal
          title="Add staff member"
          onClose={() => setCreateModalOpen(false)}
          size="large"
        >
          <form
            onSubmit={handleCreateUser}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full name" required>
                <input
                  required
                  value={createForm.full_name}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      full_name: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Email address" required>
                <input
                  required
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Temporary password" required>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={createForm.temporary_password}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      temporary_password:
                        event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Role" required>
                <select
                  required
                  value={createForm.role}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      role: event.target.value as AppRole,
                    }))
                  }
                  className={inputClassName}
                >
                  {allowedCreateRoles.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Phone">
                <input
                  value={createForm.phone}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Job title">
                <input
                  value={createForm.job_title}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      job_title: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Hourly cost">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.hourly_cost}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      hourly_cost: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Charge-out rate">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.charge_out_rate}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      charge_out_rate: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Contracted hours per week">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={
                    createForm.contracted_hours_per_week
                  }
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      contracted_hours_per_week:
                        event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Holiday entitlement">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={
                    createForm.holiday_entitlement_days
                  }
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      holiday_entitlement_days:
                        event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>
            </div>

            <FormField label="Notes">
              <textarea
                rows={4}
                value={createForm.notes}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </FormField>

            <ModalActions
              saving={saving}
              submitLabel="Create staff account"
              onCancel={() => setCreateModalOpen(false)}
            />
          </form>
        </Modal>
      )}

      {editModalOpen && selectedUser && (
        <Modal
          title={selectedUser.full_name}
          subtitle={selectedUser.email}
          onClose={() => setEditModalOpen(false)}
          size="extra-large"
        >
          <div className="space-y-8">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Staff profile
                  </h3>
                  <p className="text-sm text-slate-500">
                    Employment and application account details.
                  </p>
                </div>

                <StatusBadge active={selectedUser.is_active} />
              </div>

              <form
                onSubmit={handleUpdateUser}
                className="space-y-5"
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Full name" required>
                    <input
                      required
                      disabled={!canManageUser(selectedUser)}
                      value={editForm.full_name}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          full_name: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Email address">
                    <input
                      disabled
                      value={selectedUser.email}
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Role">
                    <select
                      disabled={
                        !canManageUser(selectedUser) ||
                        selectedUser.user_id === currentUserId
                      }
                      value={editForm.role}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          role: event.target.value as AppRole,
                        }))
                      }
                      className={inputClassName}
                    >
                      {(permissions.canManageAll
                        ? ROLE_OPTIONS
                        : ROLE_OPTIONS.filter(
                            (option) =>
                              option.value === "technician" ||
                              option.value === "apprentice",
                          )
                      ).map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Phone">
                    <input
                      disabled={!canManageUser(selectedUser)}
                      value={editForm.phone}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Job title">
                    <input
                      disabled={!canManageUser(selectedUser)}
                      value={editForm.job_title}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          job_title: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Calendar colour">
                    <input
                      type="color"
                      disabled={!canManageUser(selectedUser)}
                      value={
                        editForm.calendar_colour || "#103d2e"
                      }
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          calendar_colour:
                            event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white p-1 disabled:bg-slate-100"
                    />
                  </FormField>

                  <FormField label="Hourly cost">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!canManageUser(selectedUser)}
                      value={editForm.hourly_cost}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          hourly_cost: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Charge-out rate">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!canManageUser(selectedUser)}
                      value={editForm.charge_out_rate}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          charge_out_rate:
                            event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Contracted hours per week">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      disabled={!canManageUser(selectedUser)}
                      value={
                        editForm.contracted_hours_per_week
                      }
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          contracted_hours_per_week:
                            event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Holiday entitlement days">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      disabled={!canManageUser(selectedUser)}
                      value={
                        editForm.holiday_entitlement_days
                      }
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          holiday_entitlement_days:
                            event.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </FormField>
                </div>

                <FormField label="Notes">
                  <textarea
                    rows={4}
                    disabled={!canManageUser(selectedUser)}
                    value={editForm.notes}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </FormField>

                {canManageUser(selectedUser) && (
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save profile"}
                    </button>
                  </div>
                )}
              </form>
            </section>

            <section className="border-t border-slate-200 pt-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Qualifications
                  </h3>
                  <p className="text-sm text-slate-500">
                    Certificates, training and expiry dates.
                  </p>
                </div>

                {canManageUser(selectedUser) && (
                  <button
                    type="button"
                    onClick={openNewQualification}
                    className="rounded-xl border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    Add qualification
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {selectedUser.qualifications.map(
                  (qualification) => (
                    <article
                      key={qualification.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {qualification.qualification_name}
                          </h4>

                          <p className="mt-1 text-sm text-slate-500">
                            {qualification.issuing_body ||
                              "Issuing body not recorded"}
                          </p>
                        </div>

                        {canManageUser(selectedUser) && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditQualification(
                                  qualification,
                                )
                              }
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleDeleteQualification(
                                  qualification,
                                )
                              }
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>

                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <DataItem
                          label="Certificate number"
                          value={
                            qualification.certificate_number ||
                            "—"
                          }
                        />
                        <DataItem
                          label="Issued"
                          value={formatDate(
                            qualification.issued_date,
                          )}
                        />
                        <DataItem
                          label="Expires"
                          value={formatDate(
                            qualification.expiry_date,
                          )}
                        />
                        <DataItem
                          label="Document"
                          value={
                            qualification.document_url
                              ? "Available"
                              : "—"
                          }
                        />
                      </dl>

                      {qualification.document_url && (
                        <a
                          href={qualification.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-block text-sm font-semibold text-emerald-800 hover:underline"
                        >
                          Open certificate
                        </a>
                      )}

                      {qualification.notes && (
                        <p className="mt-3 text-sm text-slate-600">
                          {qualification.notes}
                        </p>
                      )}
                    </article>
                  ),
                )}

                {selectedUser.qualifications.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                    <p className="text-sm text-slate-500">
                      No qualifications have been recorded.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="border-t border-slate-200 pt-6">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <DataItem
                  label="Account created"
                  value={formatDate(selectedUser.created_at)}
                />
                <DataItem
                  label="Last updated"
                  value={formatDate(selectedUser.updated_at)}
                />
              </dl>
            </section>
          </div>
        </Modal>
      )}

      {qualificationModalOpen && selectedUser && (
        <Modal
          title={
            qualificationForm.id
              ? "Edit qualification"
              : "Add qualification"
          }
          onClose={() => setQualificationModalOpen(false)}
          size="large"
        >
          <form
            onSubmit={handleSaveQualification}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Qualification name" required>
                <input
                  required
                  value={
                    qualificationForm.qualification_name
                  }
                  onChange={(event) =>
                    setQualificationForm((current) => ({
                      ...current,
                      qualification_name:
                        event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Issuing body">
                <input
                  value={qualificationForm.issuing_body}
                  onChange={(event) =>
                    setQualificationForm((current) => ({
                      ...current,
                      issuing_body: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Certificate number">
                <input
                  value={
                    qualificationForm.certificate_number
                  }
                  onChange={(event) =>
                    setQualificationForm((current) => ({
                      ...current,
                      certificate_number:
                        event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Document URL">
                <input
                  type="url"
                  value={qualificationForm.document_url}
                  onChange={(event) =>
                    setQualificationForm((current) => ({
                      ...current,
                      document_url: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Issued date">
                <input
                  type="date"
                  value={qualificationForm.issued_date}
                  onChange={(event) =>
                    setQualificationForm((current) => ({
                      ...current,
                      issued_date: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Expiry date">
                <input
                  type="date"
                  value={qualificationForm.expiry_date}
                  onChange={(event) =>
                    setQualificationForm((current) => ({
                      ...current,
                      expiry_date: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>
            </div>

            <FormField label="Notes">
              <textarea
                rows={4}
                value={qualificationForm.notes}
                onChange={(event) =>
                  setQualificationForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </FormField>

            <ModalActions
              saving={saving}
              submitLabel="Save qualification"
              onCancel={() =>
                setQualificationModalOpen(false)
              }
            />
          </form>
        </Modal>
      )}
    </main>
  );
}

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">
        {value}
      </p>
    </article>
  );
}

function Avatar({ user }: { user: StaffUser | StaffUserDetail }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{
        backgroundColor: user.calendar_colour || "#103d2e",
      }}
    >
      {getInitials(user.full_name)}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-200 text-slate-600"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function TableHeading({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function DataItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-700">{value}</dd>
    </div>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600">*</span>
        )}
      </span>
      {children}
    </label>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  size = "medium",
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  size?: "medium" | "large" | "extra-large";
  children: React.ReactNode;
}) {
  const widthClass =
    size === "extra-large"
      ? "max-w-6xl"
      : size === "large"
        ? "max-w-3xl"
        : "max-w-xl";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8">
      <div
        className={`my-auto w-full ${widthClass} rounded-2xl bg-white shadow-2xl`}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalActions({
  saving,
  submitLabel,
  onCancel,
}: {
  saving: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}