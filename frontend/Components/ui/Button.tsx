import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--brand)] text-white shadow-lg shadow-emerald-950/10 hover:bg-[var(--brand-hover)] focus:ring-[var(--brand)]/30",
  secondary:
    "border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)] shadow-sm hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)] focus:ring-[var(--focus-ring)]/20",
  danger:
    "border border-transparent bg-red-600 text-white shadow-lg shadow-red-950/10 hover:bg-red-700 focus:ring-red-500/30",
};

export default function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5",
        "text-sm font-semibold transition duration-200 active:scale-[0.98]",
        "focus:outline-none focus:ring-4",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
