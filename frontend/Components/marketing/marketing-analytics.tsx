"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";

import {
  MARKETING_CONSENT_KEY,
  trackMarketingEvent,
} from "@/lib/marketing/analytics";

type Consent = "accepted" | "essential" | null;

function configured(value: string | undefined) {
  return Boolean(value?.trim());
}

export default function MarketingAnalytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>(null);

  const googleId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim();
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const linkedInPartnerId = process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID?.trim();
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();

  const analyticsConfigured = useMemo(
    () => [googleId, metaPixelId, linkedInPartnerId, clarityId].some(configured),
    [clarityId, googleId, linkedInPartnerId, metaPixelId],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(MARKETING_CONSENT_KEY);
    if (saved === "accepted" || saved === "essential") setConsent(saved);
  }, []);

  useEffect(() => {
    if (consent !== "accepted") return;
    window.gtag?.("event", "page_view", { page_path: pathname });
    window.fbq?.("track", "PageView");
  }, [consent, pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a") as HTMLAnchorElement | null;
      if (!link) return;

      const href = link.getAttribute("href") || "";
      if (href.startsWith("/signup")) {
        trackMarketingEvent("trial_cta_clicked", { href, page_path: pathname });
      } else if (href === "/contact" || href.startsWith("/contact?")) {
        trackMarketingEvent("demo_cta_clicked", { href, page_path: pathname });
      } else if (href === "/demo" || href.startsWith("/demo?")) {
        trackMarketingEvent("product_demo_clicked", { href, page_path: pathname });
      } else if (href === "/pricing" || href.startsWith("/pricing?")) {
        trackMarketingEvent("pricing_clicked", { href, page_path: pathname });
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  function save(next: Exclude<Consent, null>) {
    window.localStorage.setItem(MARKETING_CONSENT_KEY, next);
    setConsent(next);
    window.dispatchEvent(new Event("agricore-consent-change"));
  }

  const enabled = consent === "accepted";

  return (
    <>
      {enabled && googleId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleId)}`}
            strategy="afterInteractive"
          />
          <Script id="agricore-google-analytics" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${googleId}',{send_page_view:true});`}
          </Script>
        </>
      ) : null}

      {enabled && metaPixelId ? (
        <Script id="agricore-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}

      {enabled && linkedInPartnerId ? (
        <Script id="agricore-linkedin-insight" strategy="afterInteractive">
          {`_linkedin_partner_id='${linkedInPartnerId}';window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(_linkedin_partner_id);(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName('script')[0];var b=document.createElement('script');b.type='text/javascript';b.async=true;b.src='https://snap.licdn.com/li.lms-analytics/insight.min.js';s.parentNode.insertBefore(b,s);})(window.lintrk);`}
        </Script>
      ) : null}

      {enabled && clarityId ? (
        <Script id="agricore-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script','${clarityId}');`}
        </Script>
      ) : null}

      {analyticsConfigured && consent === null ? (
        <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-4xl rounded-2xl border border-emerald-950/15 bg-white p-4 shadow-2xl shadow-emerald-950/20 sm:inset-x-6 sm:p-5 dark:border-white/15 dark:bg-slate-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-950/10 bg-emerald-50 text-emerald-800 dark:border-white/10 dark:bg-emerald-950 dark:text-emerald-300">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="font-black text-slate-950 dark:text-white">Optional analytics cookies</p>
                <p className="mt-1 max-w-2xl text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">
                  Essential storage keeps AgriCore working. With your permission, optional analytics help us understand which marketing pages and campaigns lead to demos and trials.
                  {" "}<Link href="/cookies" className="font-black text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-300">Cookie policy</Link>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => save("essential")}
                className="rounded-xl border border-emerald-950/15 px-4 py-2.5 text-sm font-black text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
              >
                Essential only
              </button>
              <button
                type="button"
                onClick={() => save("accepted")}
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-800"
              >
                Accept analytics
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
