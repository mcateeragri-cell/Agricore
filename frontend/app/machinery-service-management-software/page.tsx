import type { Metadata } from "next";
import SearchLanding from "@/Components/marketing/search-landing";

export const metadata: Metadata = {
  title: "Machinery Service Management Software",
  description: "Service management software for machinery businesses covering customers, assets, jobs, field teams, maintenance, stock, purchasing, quotes and invoices.",
  alternates: { canonical: "/machinery-service-management-software" },
};

export default function Page() {
  return <SearchLanding
    eyebrow="Machinery service management software"
    title="Keep machinery service operations connected from booking to invoice."
    description="AgriCore is designed for businesses whose service work revolves around machines—not generic tickets. Keep customer assets, workshop jobs, field engineers, maintenance, parts and commercial records connected."
    audience="machinery service businesses"
    pains={[
      "Stop treating machines as notes inside a customer record.",
      "See service workload across office, workshop and field teams.",
      "Keep maintenance history available when the next fault arrives.",
      "Connect parts, labour, quotes and invoices to the operational job.",
    ]}
    benefits={[
      { title: "Machine-centred CRM", description: "Store customer ownership and machine records as connected first-class data." },
      { title: "Service operations", description: "Manage workshop jobs, field callouts, assignments, calendar and dispatch together." },
      { title: "Maintenance programmes", description: "Build repeat service schedules around hours, dates and machine requirements." },
      { title: "Mobile technicians", description: "Give engineers a field workflow for labour, parts, photos, signatures and history." },
      { title: "Inventory & purchasing", description: "Connect parts availability, suppliers and purchase orders to service demand." },
      { title: "Commercial workflow", description: "Create quotes and invoices alongside the operational history of the work." },
    ]}
    secondaryTitle="See whether AgriCore fits your service operation."
    secondaryCopy="Use the read-only demo for an immediate look or request a tailored walkthrough for your team, workshop and service process."
  />;
}
