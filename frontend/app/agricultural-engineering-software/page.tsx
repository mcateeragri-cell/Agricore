import type { Metadata } from "next";
import SearchLanding from "@/Components/marketing/search-landing";

export const metadata: Metadata = {
  title: "Agricultural Engineering Software",
  description: "Job management, machine history, technicians, stock, quotes and invoices in software built specifically for agricultural engineering businesses.",
  alternates: { canonical: "/agricultural-engineering-software" },
};

export default function Page() {
  return <SearchLanding
    eyebrow="Agricultural engineering software"
    title="Software built around agricultural engineering work."
    description="AgriCore connects customer records, machine history, workshop jobs, field engineers, service programmes, stock, quotes and invoices without forcing your team into a generic CRM workflow."
    audience="agricultural engineering businesses"
    pains={[
      "Stop rebuilding the same customer and machine information across job sheets and invoices.",
      "Give engineers machine history before they start the next repair.",
      "Keep workshop and field jobs visible to the office in one place.",
      "Capture labour, parts, photos and signatures against the actual job record.",
    ]}
    benefits={[
      { title: "Customer & machine history", description: "Keep ownership, serial numbers, hours, previous faults, service events and completed work connected." },
      { title: "Workshop & field jobs", description: "Schedule, assign and complete work without splitting field callouts from workshop records." },
      { title: "Technician mobile workflow", description: "Record travel, labour, parts, photos, signatures and completion from the engineer's phone." },
      { title: "Service programmes", description: "Track repeat maintenance and identify upcoming work before service intervals are missed." },
      { title: "Stock & purchasing", description: "Connect workshop inventory, suppliers and purchase orders to the work consuming those parts." },
      { title: "Quotes & invoices", description: "Move operational data through to commercial documents without retyping the completed job." },
    ]}
    secondaryTitle="Explore AgriCore with no account required."
    secondaryCopy="The live product demo uses synthetic agricultural engineering data and is completely read-only, so you can inspect the workflow before starting a trial."
  />;
}
