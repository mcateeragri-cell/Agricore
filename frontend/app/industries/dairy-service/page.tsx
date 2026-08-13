import type { Metadata } from "next";
import IndustryLanding from "@/Components/marketing/industry-landing";

export const metadata: Metadata = {
  title: "Service management software for dairy engineering teams",
  description: "Manage dairy service customers, equipment, field jobs, planned servicing, technicians, parts, quotes and invoices with AgriCore.",
  alternates: { canonical: "/industries/dairy-service" },
};

export default function Page() {
  return <IndustryLanding
    eyebrow="Dairy service teams"
    title="Keep recurring servicing, emergency callouts and customer equipment history together."
    description="Dairy engineering teams can use the same machine, job, stock and technician workflows to manage service work around parlours, feeding, cooling and associated farm equipment."
    pains={["Keep repeat service work visible before it becomes an emergency callout.","Give field engineers previous job and equipment history.","Connect parts and labour to the customer job while on site.","Move completed work into office review and invoicing without rebuilding the job record."]}
    capabilities={[
      { title: "Customer equipment history", description: "Keep service and repair activity attached to the equipment record for quicker future diagnosis." },
      { title: "Planned service", description: "Use service programmes to schedule recurring maintenance and surface due work." },
      { title: "Emergency callouts", description: "Create and dispatch urgent jobs while keeping technicians and the office on the same record." },
      { title: "Parts & stock", description: "Track workshop inventory, supplier purchasing and the parts used during service visits." },
      { title: "Quotes & invoicing", description: "Keep commercial documents connected to the operational history behind them." },
      { title: "Field workflow", description: "Capture technician labour, photos, notes and customer sign-off from the farm." },
    ]}
    outcomeTitle="One service history across planned work and breakdowns."
    outcomeCopy="AgriCore helps dairy service businesses keep recurring maintenance and reactive repairs visible in the same operational system so the next engineer has better context."
  />;
}
