import Card from "../ui/Card";

type SummaryCard = {
  title: string;
  value: string;
  detail: string;
  accent: string;
  icon: string;
};

const summaryCards: SummaryCard[] = [
  {
    title: "Jobs in progress",
    value: "6",
    detail: "3 require attention",
    accent: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    icon: "🚜",
  },
  {
    title: "Outstanding invoices",
    value: "£12,840",
    detail: "8 invoices unpaid",
    accent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    icon: "💷",
  },
  {
    title: "Revenue this month",
    value: "£18,620",
    detail: "Up 14% from last month",
    accent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: "📈",
  },
  {
    title: "Upcoming services",
    value: "9",
    detail: "Due within 30 days",
    accent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: "🔧",
  },
];

export default function SummaryCards() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map((card) => (
        <Card
          key={card.title}
          className="group rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                {card.title}
              </p>

              <h3 className="mt-4 break-words text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {card.value}
              </h3>

              <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-400">
                {card.detail}
              </p>
            </div>

            <div
              className={`ml-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${card.accent}`}
            >
              {card.icon}
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}