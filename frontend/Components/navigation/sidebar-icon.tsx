import type { IconName } from "./navigation-types";

type SidebarIconProps = {
  name: IconName;
  className?: string;
};

export default function SidebarIcon({
  name,
  className,
}: SidebarIconProps) {
  const commonProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );

    case "customers":
    case "users":
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "machines":
      return (
        <svg {...commonProps}>
          <circle cx="7" cy="17" r="3" />
          <circle cx="18" cy="17" r="2" />
          <path d="M4 17H2V9h9l3 4h4v2" />
          <path d="M7 14V7h5" />
          <path d="M12 7h4l2 6" />
        </svg>
      );

    case "jobs":
      return (
        <svg {...commonProps}>
          <path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-3-3z" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      );

    case "quotes":
      return (
        <svg {...commonProps}>
          <path d="M6 2h9l4 4v16H6z" />
          <path d="M14 2v5h5M9 12h6M9 16h6" />
        </svg>
      );

    case "invoices":
      return (
        <svg {...commonProps}>
          <path d="M5 3h14v18l-3-2-4 2-4-2-3 2z" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      );

    case "stock":
      return (
        <svg {...commonProps}>
          <path d="M21 8l-9 5-9-5" />
          <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
          <path d="M12 13v8" />
        </svg>
      );

    case "reports":
      return (
        <svg {...commonProps}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20V7" />
        </svg>
      );

    case "administration":
    case "settings":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V20H9.75v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 5.09 15a1.7 1.7 0 0 0-1.55-1H3v-3h.54a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1-1.55V4h4.5v.79a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 18.91 10a1.7 1.7 0 0 0 1.55 1H21v3h-.54a1.7 1.7 0 0 0-1.06 1z" />
        </svg>
      );

    case "roles":
      return (
        <svg {...commonProps}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="M6 16a3 3 0 0 1 6 0M15 9h3M15 13h3" />
        </svg>
      );

    case "manufacturers":
      return (
        <svg {...commonProps}>
          <path d="M3 21V9l6 3V9l6 3V5l6 3v13z" />
          <path d="M7 17h2M13 17h2M18 17h1" />
        </svg>
      );

    case "templates":
      return (
        <svg {...commonProps}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...commonProps}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      );

    case "logout":
      return (
        <svg {...commonProps}>
          <path d="M10 17l5-5-5-5M15 12H3" />
          <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
        </svg>
      );

    case "menu":
      return (
        <svg {...commonProps}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );

    case "close":
      return (
        <svg {...commonProps}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );

    case "more":
      return (
        <svg {...commonProps}>
          <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
      );

    default:
      return null;
  }
}