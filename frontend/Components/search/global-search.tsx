"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  UserRound,
  Tractor,
  Wrench,
  FileText,
  ReceiptText,
  PackageSearch,
  UsersRound,
  Plus,
} from "lucide-react";

import { useNavigationUser } from "@/Components/navigation/use-navigation-user";

type ResultType =
  | "customer"
  | "machine"
  | "job"
  | "quote"
  | "invoice"
  | "stock"
  | "user";

type SearchResult = {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  href: string;
};

type SearchResponse = {
  results?: SearchResult[];
  error?: string;
};

type QuickAction = {
  label: string;
  href: string;
};

const TYPE_LABELS: Record<ResultType, string> = {
  customer: "Customer",
  machine: "Machine",
  job: "Job",
  quote: "Quote",
  invoice: "Invoice",
  stock: "Stock",
  user: "User",
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: "New job", href: "/jobs/new" },
  { label: "Customers", href: "/customers" },
  { label: "Machines", href: "/machines" },
  { label: "New quote", href: "/quotes/new" },
  { label: "New stock item", href: "/stock/new" },
];

function ResultIcon({ type }: { type: ResultType }) {
  const props = { className: "h-5 w-5", strokeWidth: 2 };
  if (type === "customer") return <UserRound {...props} />;
  if (type === "machine") return <Tractor {...props} />;
  if (type === "job") return <Wrench {...props} />;
  if (type === "quote") return <FileText {...props} />;
  if (type === "invoice") return <ReceiptText {...props} />;
  if (type === "stock") return <PackageSearch {...props} />;
  return <UsersRound {...props} />;
}

export default function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const { userState } = useNavigationUser();
  const enabled = userState.enabledFeatures.includes("global_search");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    const customHandler = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("agricore:open-search", customHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("agricore:open-search", customHandler);
    };
  }, [enabled]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/search/global?q=${encodeURIComponent(query.trim())}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json()) as SearchResponse;
        if (!response.ok) throw new Error(body.error || "Unable to search AgriCore.");
        setResults(body.results ?? []);
        setActiveIndex(0);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "Unable to search AgriCore.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const grouped = useMemo(() => {
    const map = new Map<ResultType, SearchResult[]>();
    for (const result of results) {
      const group = map.get(result.type) ?? [];
      group.push(result);
      map.set(result.type, group);
    }
    return Array.from(map.entries());
  }, [results]);

  const flatItems = useMemo(
    () => (query.trim().length >= 2 ? results.map((result) => result.href) : QUICK_ACTIONS.map((action) => action.href)),
    [query, results],
  );

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(flatItems.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
    } else if (event.key === "Enter" && flatItems[activeIndex]) {
      event.preventDefault();
      navigate(flatItems[activeIndex]);
    }
  }

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-5 top-5 z-20 hidden items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-bold text-slate-700 shadow-sm backdrop-blur transition hover:border-emerald-300 hover:text-emerald-800 lg:flex dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
        aria-label="Open AgriCore global search"
      >
        <Search className="h-4 w-4" />
        Search
        <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500 dark:bg-slate-800">Ctrl K</kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/45 px-3 pt-[10vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <section
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-700">
              <Search className="h-5 w-5 shrink-0 text-emerald-700" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search customers, machines, jobs, invoices, stock…"
                className="min-h-16 flex-1 bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
              />
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close search">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-3">
              {query.trim().length < 2 ? (
                <div>
                  <p className="px-2 pb-2 text-xs font-black uppercase tracking-[0.13em] text-slate-500">Quick actions</p>
                  <div className="space-y-1">
                    {QUICK_ACTIONS.map((action, index) => (
                      <button
                        type="button"
                        key={action.href}
                        onClick={() => navigate(action.href)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${activeIndex === index ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"}`}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Plus className="h-4 w-4" /></span>
                        {action.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 px-2 text-xs font-semibold text-slate-400">Type at least two characters to search the active company.</p>
                </div>
              ) : loading ? (
                <div className="px-3 py-12 text-center text-sm font-semibold text-slate-500">Searching AgriCore…</div>
              ) : error ? (
                <div className="rounded-2xl bg-red-50 px-4 py-4 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>
              ) : results.length === 0 ? (
                <div className="px-3 py-12 text-center text-sm font-semibold text-slate-500">No results found for “{query.trim()}”.</div>
              ) : (
                <div className="space-y-4">
                  {grouped.map(([type, rows]) => (
                    <div key={type}>
                      <p className="px-2 pb-1 text-xs font-black uppercase tracking-[0.13em] text-slate-500">{TYPE_LABELS[type]}</p>
                      <div className="space-y-1">
                        {rows.map((result) => {
                          const flatIndex = results.findIndex((item) => item.type === result.type && item.id === result.id);
                          return (
                            <Link
                              key={`${result.type}-${result.id}`}
                              href={result.href}
                              onClick={() => setOpen(false)}
                              className={`flex items-start gap-3 rounded-xl px-3 py-3 transition ${activeIndex === flatIndex ? "bg-emerald-50 dark:bg-emerald-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                            >
                              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><ResultIcon type={result.type} /></span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-black text-slate-950 dark:text-white">{result.title}</span>
                                <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{result.subtitle || TYPE_LABELS[result.type]}</span>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-[11px] font-bold text-slate-400 dark:border-slate-700">
              <span>↑↓ navigate · Enter open · Esc close</span>
              <span>Active company only</span>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
