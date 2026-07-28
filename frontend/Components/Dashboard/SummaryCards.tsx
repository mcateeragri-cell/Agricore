import Card from "../ui/Card";

const summaryCards = [
  {
    title: "Jobs in progress",
    value: "6",
    detail: "3 require attention",
    accent: "bg-amber-100 text-amber-700",
  },
  {
    title: "Outstanding invoices",
    value: "£12,840",
    detail: "8 invoices unpaid",
    accent: "bg-red-100 text-red-700",
  },
  {
    title: "Revenue this month",
    value: "£18,620",
    detail: "Up 14% from last month",
    accent: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Upcoming services",
    value: "9",
    detail: "Due within 30 days",
    accent: "bg-blue-100 text-blue-700",
  },
];

export default function SummaryCards() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map((card) => (
        <Card key={card.title} className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-500">
              {card.title}
            </p>

            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.accent}`}
            >
              ↗
            </span>
          </div>

          <p className="mt-5 text-3xl font-bold tracking-tight">
            {card.value}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            {card.detail}
          </p>
        </Card>
      ))}
    </section>
  );
}