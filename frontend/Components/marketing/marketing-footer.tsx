import Image from "next/image";
import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="border-t border-emerald-950/10 bg-white/70 dark:border-white/10 dark:bg-slate-950/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
        <div className="max-w-md">
          <div className="flex items-center gap-3">
            <Image src="/icons/icon-192.png" alt="" width={42} height={42} className="rounded-xl" />
            <div className="text-xl font-black text-slate-950 dark:text-white">AgriCore</div>
          </div>
          <p className="mt-4 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">Built around the real workflow of agricultural engineers, workshops and field-service teams.</p>
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-900 dark:text-white">Product</p>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Link href="/features" className="hover:text-emerald-700">Features</Link>
            <Link href="/pricing" className="hover:text-emerald-700">Pricing</Link>
            <Link href="/signup" className="hover:text-emerald-700">Start free trial</Link>
            <Link href="/login" className="hover:text-emerald-700">Sign in</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-900 dark:text-white">Company</p>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Link href="/contact" className="hover:text-emerald-700">Contact</Link>
            <Link href="/privacy" className="hover:text-emerald-700">Privacy</Link>
            <Link href="/terms" className="hover:text-emerald-700">Terms</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-emerald-950/10 px-5 py-5 text-center text-xs font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">© {new Date().getFullYear()} AgriCore. Agricultural service management software.</div>
    </footer>
  );
}
