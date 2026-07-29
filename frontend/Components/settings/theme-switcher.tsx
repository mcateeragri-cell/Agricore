"use client";

import { useTheme } from "../theme/theme-provider";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Appearance
        </h3>

        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Choose how AgriCore looks on this device.
        </p>
      </div>

      <div
        className="grid gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Theme preference"
      >
        <ThemeOption
          value="light"
          label="Light"
          description="Always use light mode"
          selected={theme === "light"}
          onSelect={() => setTheme("light")}
          icon={<SunIcon />}
        />

        <ThemeOption
          value="dark"
          label="Dark"
          description="Always use dark mode"
          selected={theme === "dark"}
          onSelect={() => setTheme("dark")}
          icon={<MoonIcon />}
        />

        <ThemeOption
          value="system"
          label="System"
          description="Match this device"
          selected={theme === "system"}
          onSelect={() => setTheme("system")}
          icon={<SystemIcon />}
        />
      </div>
    </div>
  );
}

function ThemeOption({
  value,
  label,
  description,
  selected,
  onSelect,
  icon,
}: {
  value: string;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-value={value}
      onClick={onSelect}
      className={`rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:ring-emerald-500"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            selected
              ? "bg-emerald-700 text-white dark:bg-emerald-500 dark:text-slate-950"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          {icon}
        </span>

        <span>
          <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
            {label}
          </span>

          <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-400">
            {description}
          </span>
        </span>
      </div>
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
