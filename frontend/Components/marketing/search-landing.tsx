import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  PackageSearch,
  Smartphone,
  Tractor,
  Wrench,
} from "lucide-react";

import MarketingShell from "@/Components/marketing/marketing-shell";
import ProductPreview from "@/Components/marketing/product-preview";

type SearchLandingProps = {
  eyebrow: string;
  title: string;
  description: string;
  audience: string;
  pains: string[];
  benefits: Array<{ title: string; description: string }>;
  secondaryTitle: string;
  secondaryCopy: string;
};

const capabilityIcons = [Tractor, Wrench, Smartphone, ClipboardCheck, PackageSearch, FileText] as const;

export default function SearchLanding({
  eyebrow,
  title,
  description,
  audience,
  pains,
  benefits,
  secondaryTitle,
  secondaryCopy,
}: SearchLandingProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AgriCore",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description,
    audience: {
      "@type": "BusinessAudience",
      audienceType: audience,
    },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "49",
      highPrice: "225",
      priceCurrency: "GBP",
      offerCount: "3",
    },
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main>
        <section className="relative overflow-hidden border-b border-emerald-950/10 bg-[radial-gradient(circle_at_8%_8%,rgba(52,211,153,.22),transparent_30rem)] dark:border-white/10">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[.92fr_1.08fr] lg:px-10 lg:py-24">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">{eyebrow}</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[.97] tracking-[-0.055em] text-slate-950 sm:text-6xl dark:text-white">{title}</h1>
              <p className="mt-6 max-w-3xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">{description}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup?plan=professional" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-4 font-black text-white shadow-lg shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-emerald-800">
                  Start 14-day free trial <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/demo" className="inline-flex items-center justify-center rounded-2xl border border-emerald-950/10 bg-white px-6 py-4 font-black text-slate-950 shadow-sm transition hover:border-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
                  Explore live demo
                </Link>
                <Link href="/contact" className="inline-flex items-center justify-center rounded-2xl px-5 py-4 font-black text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-white/5">
                  Book demo
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                <span>✓ £0 charged today</span><span>✓ 14 days free</span><span>✓ No demo login required</span>
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section className="border-b border-emerald-950/10 bg-white/70 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">For {audience}</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Replace disconnected admin with one service workflow.</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pains.map((pain) => (
                  <div key={pain} className="flex gap-3 rounded-2xl border border-emerald-950/10 bg-white p-4 text-sm font-semibold leading-6 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                    <span>{pain}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">What AgriCore connects</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">The operational records already used by your team.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => {
              const Icon = capabilityIcons[index % capabilityIcons.length];
              return (
                <article key={benefit.title} className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <span className="inline-flex rounded-xl border border-emerald-950/10 bg-emerald-50 p-2.5 text-emerald-800 dark:border-white/10 dark:bg-emerald-950 dark:text-emerald-300"><Icon className="h-5 w-5" /></span>
                  <h3 className="mt-4 text-lg font-black">{benefit.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{benefit.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-emerald-950/10 bg-emerald-950 text-white dark:border-white/10">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">See the workflow before you commit</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">{secondaryTitle}</h2>
              <p className="mt-4 max-w-3xl font-medium leading-7 text-emerald-50/80">{secondaryCopy}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/demo" className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 font-black text-emerald-950">Explore demo</Link>
              <Link href="/contact" className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-6 py-4 font-black text-white">Request tailored demo</Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
