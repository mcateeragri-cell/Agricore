import type { Metadata } from "next";
import IndustryLanding from "@/Components/marketing/industry-landing";

export const metadata: Metadata = {
  title: "Workshop software for farm machinery dealers",
  description: "Coordinate workshop and field service, machine history, stock, sales opportunities, technicians and customer invoicing across a farm machinery dealership.",
  alternates: { canonical: "/industries/machinery-dealers" },
};

export default function Page() {
  return <IndustryLanding
    eyebrow="Farm machinery dealerships"
    title="Give service managers, workshop teams and field engineers the same operational picture."
    description="AgriCore brings customer machines, jobs, technician workload, stock, service programmes and commercial follow-up into one company-scoped platform built for machinery businesses."
    pains={["See workshop and field workload without relying on whiteboards and separate spreadsheets.","Keep customer machine history available across service staff.","Connect stock and purchasing to the jobs using the parts.","Give management clearer reporting without interrupting technicians for updates."]}
    capabilities={[
      { title: "Dispatch & scheduling", description: "Plan workshop and field work, assign engineers and keep current job status visible." },
      { title: "Dealer machine history", description: "Maintain service events, hours, faults and repairs against each customer machine." },
      { title: "Service programmes", description: "Identify due work earlier and turn maintenance schedules into future workshop demand." },
      { title: "Stock Pro", description: "Manage inventory, suppliers, purchasing and job consumption from the same operating system." },
      { title: "Reports & intelligence", description: "Review workload, revenue, overdue invoices, service exposure and repeat failure patterns." },
      { title: "Enterprise controls", description: "Enterprise adds deeper financial control and dealer-oriented capabilities for larger organisations." },
    ]}
    outcomeTitle="A clearer service operation without forcing every role into the same screen."
    outcomeCopy="Office, management and technician experiences stay role-aware, helping larger machinery businesses keep control while field engineers remain focused on the job in front of them."
  />;
}
