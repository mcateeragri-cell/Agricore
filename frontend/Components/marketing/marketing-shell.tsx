import MarketingFooter from "./marketing-footer";
import MarketingHeader from "./marketing-header";

export default function MarketingShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-[#f7fbf8] text-slate-950 dark:bg-slate-950 dark:text-white">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}
