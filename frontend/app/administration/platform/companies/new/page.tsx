"use client";

import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type FormState = {
  companyName: string;
  slug: string;
  businessType: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  townCity: string;
  countyRegion: string;
  postcode: string;

  administratorName: string;
  administratorEmail: string;
  administratorPassword: string;
};

const INITIAL_FORM: FormState = {
  companyName: "",
  slug: "",
  businessType:
    "Agricultural Engineering",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  townCity: "",
  countyRegion: "",
  postcode: "",

  administratorName: "",
  administratorEmail: "",
  administratorPassword: "",
};

export default function NewPlatformCompanyPage() {
  const [form, setForm] =
    useState<FormState>(INITIAL_FORM);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  function update(
    key: keyof FormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "companyName" &&
      !current.slug
        ? {
            slug: slugify(value),
          }
        : {}),
    }));
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.access_token
      ) {
        throw new Error(
          "You must be signed in to create a company.",
        );
      }

      const response = await fetch(
        "/api/administration/platform/companies",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(form),
        },
      );

      const result =
        (await response.json()) as {
          error?: string;
          message?: string;
          company?: {
            company_name?: string;
          };
        };

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to create the company.",
        );
      }

      setSuccess(
        result.message ||
          "Company created successfully.",
      );

      setForm(INITIAL_FORM);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create the company.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              AgriCore Platform
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
              Create company
            </h1>

            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Create a new tenant and its first company administrator.
            </p>
          </div>

          <Link
            href="/platform/companies"
            className="rounded-xl border border-slate-300 bg-white/80 px-4 py-3 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900/70 dark:text-white"
          >
            Back to dashboard
          </Link>
        </div>

        <form
          onSubmit={submit}
          className="mt-6 space-y-5"
        >
          <Section title="Company details">
            <Field
              label="Company name"
              value={form.companyName}
              required
              onChange={(value) =>
                update(
                  "companyName",
                  value,
                )
              }
            />

            <Field
              label="Company slug"
              value={form.slug}
              required
              hint="Used internally to identify the company."
              onChange={(value) =>
                update("slug", slugify(value))
              }
            />

            <Field
              label="Business type"
              value={form.businessType}
              onChange={(value) =>
                update(
                  "businessType",
                  value,
                )
              }
            />

            <Field
              label="Business email"
              type="email"
              value={form.email}
              onChange={(value) =>
                update("email", value)
              }
            />

            <Field
              label="Business phone"
              type="tel"
              value={form.phone}
              onChange={(value) =>
                update("phone", value)
              }
            />
          </Section>

          <Section title="Address">
            <Field
              label="Address line 1"
              value={form.addressLine1}
              onChange={(value) =>
                update(
                  "addressLine1",
                  value,
                )
              }
            />

            <Field
              label="Address line 2"
              value={form.addressLine2}
              onChange={(value) =>
                update(
                  "addressLine2",
                  value,
                )
              }
            />

            <Field
              label="Town or city"
              value={form.townCity}
              onChange={(value) =>
                update("townCity", value)
              }
            />

            <Field
              label="County or region"
              value={form.countyRegion}
              onChange={(value) =>
                update(
                  "countyRegion",
                  value,
                )
              }
            />

            <Field
              label="Postcode"
              value={form.postcode}
              onChange={(value) =>
                update(
                  "postcode",
                  value.toUpperCase(),
                )
              }
            />
          </Section>

          <Section title="First administrator">
            <Field
              label="Full name"
              value={
                form.administratorName
              }
              required
              onChange={(value) =>
                update(
                  "administratorName",
                  value,
                )
              }
            />

            <Field
              label="Email address"
              type="email"
              value={
                form.administratorEmail
              }
              required
              onChange={(value) =>
                update(
                  "administratorEmail",
                  value,
                )
              }
            />

            <Field
              label="Temporary password"
              type="password"
              value={
                form.administratorPassword
              }
              hint="Required only when this email does not already have an AgriCore account. Minimum 10 characters."
              onChange={(value) =>
                update(
                  "administratorPassword",
                  value,
                )
              }
            />
          </Section>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200">
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="min-h-14 w-full rounded-xl bg-[#0c4a3a] px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-[#0a3f31] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Creating company…"
              : "Create company"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75">
      <h2 className="text-lg font-bold text-slate-950 dark:text-white">
        {title}
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  type = "text",
  required = false,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  required?: boolean;
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white/90 px-4 text-sm font-semibold text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950/80 dark:text-white"
      />

      {hint ? (
        <span className="mt-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}