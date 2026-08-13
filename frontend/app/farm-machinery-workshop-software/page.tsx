import type { Metadata } from "next";
import SearchLanding from "@/Components/marketing/search-landing";

export const metadata: Metadata = {
  title: "Farm Machinery Workshop Software",
  description: "Manage farm machinery workshop jobs, service history, technicians, stock, purchasing and invoicing from one connected platform.",
  alternates: { canonical: "/farm-machinery-workshop-software" },
};

export default function Page() {
  return <SearchLanding
    eyebrow="Farm machinery workshop software"
    title="See the whole workshop without chasing job sheets."
    description="AgriCore gives machinery workshops one operational view of customers, machines, job status, technician time, parts, service history and invoicing."
    audience="farm machinery workshops"
    pains={[
      "Know which machines are booked, in progress, awaiting parts or ready to invoice.",
      "Keep the job record attached to the machine instead of buried in paper or messages.",
      "Record technician labour and parts as the work happens.",
      "Give the office a clearer view of workload and outstanding work.",
    ]}
    benefits={[
      { title: "Workshop job control", description: "Track status, engineer assignment, diagnosis, work carried out and completion in one job card." },
      { title: "Machine service history", description: "See previous repairs, maintenance and hour readings before work begins." },
      { title: "Technician time", description: "Capture labour against the job and retain a clearer operational history." },
      { title: "Parts & stock", description: "Record parts used, monitor stock and create purchase orders for workshop requirements." },
      { title: "Service scheduling", description: "Use calendar, dispatch and service programmes to plan future workload." },
      { title: "Job to invoice", description: "Turn completed work into professional invoicing without rebuilding the job from scratch." },
    ]}
    secondaryTitle="Show your service manager the actual workflow."
    secondaryCopy="Use the interactive read-only demo for a quick product review, or request a tailored demonstration around your workshop process."
  />;
}
