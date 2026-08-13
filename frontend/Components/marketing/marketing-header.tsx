import Link from "next/link";

import AgriCoreMark from "@/Components/branding/agricore-mark";

const links = [
  { href: "/features", label: "Features" },
  { href: "/industries", label: "Industries" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
  { href: "/security", label: "Security" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-emerald-950/10 bg-[#f7fbf8]/90 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3.5 sm:px-8 lg:px-10">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="AgriCore home">
          <AgriCoreMark size={46} priority />
          <div className="min-w-0">
            <div className="text-lg font-black tracking-tight text-slate-950 dark:text-white">AgriCore</div>
            <div className="hidden truncate text-[10px] font-black uppercase tracking-[0.17em] text-emerald-800 sm:block dark:text-emerald-300">Agricultural service management</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 xl:flex" aria-label="Marketing navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-bold text-slate-700 transition hover:text-emerald-800 dark:text-slate-200 dark:hover:text-emerald-300">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Link href="/login" className="rounded-xl px-3 py-2.5 text-sm font-black text-slate-800 transition hover:bg-white dark:text-slate-100 dark:hover:bg-white/10 sm:px-4">Sign in</Link>
          <Link href="/contact" className="hidden rounded-xl border border-emerald-950/15 bg-white/70 px-4 py-2.5 text-sm font-black text-slate-900 transition hover:border-emerald-700 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-emerald-400 sm:inline-flex">Book demo</Link>
          <Link href="/signup" className="rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-emerald-800 sm:px-4">Start free trial</Link>
        </div>
      </div>

      <nav className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-5 pb-3 text-xs font-black text-slate-600 xl:hidden dark:text-slate-300" aria-label="Mobile marketing navigation">
        {links.map((link) => <Link key={link.href} href={link.href} className="whitespace-nowrap hover:text-emerald-700">{link.label}</Link>)}
      </nav>
    </header>
  );
}
