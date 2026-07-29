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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Primary navigation"
    >
      <div className="grid h-16 grid-cols-5">
        {mobilePrimaryItems.map((item) => {
          const active = isLinkActive(pathname, item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition ${
                active
                  ? "text-[#103d2e]"
                  : "text-slate-500 active:bg-slate-100"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <SidebarIcon
                name={item.icon}
                className="h-5 w-5"
              />
              <span className="max-w-full truncate">
                {item.name}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMore}
          className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold text-slate-500 transition active:bg-slate-100"
        >
          <SidebarIcon name="more" className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
