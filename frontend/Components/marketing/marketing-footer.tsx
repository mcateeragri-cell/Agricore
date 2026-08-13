import Image from "next/image";
import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="border-t border-emerald-950/10 bg-emerald-950 text-white dark:border-white/10">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.35fr_.9fr_1fr_.9fr_.9fr] lg:px-10">
        <div className="max-w-md">
          <div className="flex items-center gap-3">
            <Image src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl shadow-lg" />
            <div>
              <div className="text-xl font-black">AgriCore</div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Built for agricultural engineers</div>
            </div>
          </div>
          <p className="mt-5 text-sm font-medium leading-6 text-emerald-50/75">Run customers, machines, workshop jobs and field engineers from one platform designed around agricultural service work.</p>
          <p className="mt-4 text-xs font-semibold text-emerald-50/55">AgriCore is currently operated by McAteer Agricultural Services Ltd.</p>
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-emerald-300">Product</p>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-emerald-50/75">
            <Link href="/features" className="hover:text-white">Features</Link>
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/roi-calculator" className="hover:text-white">ROI calculator</Link>
            <Link href="/demo" className="hover:text-white">Product demo</Link>
            <Link href="/signup" className="hover:text-white">Start free trial</Link>
            <Link href="/login" className="hover:text-white">Sign in</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-emerald-300">Solutions</p>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-emerald-50/75">
            <Link href="/agricultural-engineering-software" className="hover:text-white">Agricultural engineers</Link>
            <Link href="/farm-machinery-workshop-software" className="hover:text-white">Workshop software</Link>
            <Link href="/mobile-job-sheets-agricultural-engineers" className="hover:text-white">Mobile job sheets</Link>
            <Link href="/machinery-service-management-software" className="hover:text-white">Service management</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-emerald-300">Company</p>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-emerald-50/75">
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/security" className="hover:text-white">Security</Link>
            <Link href="/blog" className="hover:text-white">Insights</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-emerald-300">Legal</p>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-emerald-50/75">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/cookies" className="hover:text-white">Cookies</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs font-semibold text-emerald-50/60">© {new Date().getFullYear()} AgriCore. Agricultural service management software.</div>
    </footer>
  );
}
