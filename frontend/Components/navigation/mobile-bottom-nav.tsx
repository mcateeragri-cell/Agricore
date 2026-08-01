"use client";

import Link from "next/link";

import { mobilePrimaryItems } from "./navigation-data";
import { isLinkActive } from "./navigation-menu";
import SidebarIcon from "./sidebar-icon";

type MobileBottomNavProps = {
  pathname: string;
  onOpenMore: () => void;
};

export default function MobileBottomNav({
  pathname,
  onOpenMore,
}: MobileBottomNavProps) {
  return (
    <nav
      className="agricore-glass fixed inset-x-2 bottom-2 z-40 overflow-hidden rounded-2xl border pb-[env(safe-area-inset-bottom)] shadow-2xl lg:hidden"
      aria-label="Primary navigation"
    >
      <div className="grid h-16 grid-cols-5">
        {mobilePrimaryItems.map((item) => {
          const active = isLinkActive(pathname, item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition ${
                active
                  ? "text-[var(--brand)]"
                  : "text-[var(--text-muted)] active:bg-[var(--surface-strong)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-[var(--brand)]" />
              )}
              <SidebarIcon name={item.icon} className="h-5 w-5" />
              <span className="max-w-full truncate">{item.name}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMore}
          className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold text-[var(--text-muted)] transition active:bg-[var(--surface-strong)]"
        >
          <SidebarIcon name="more" className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
