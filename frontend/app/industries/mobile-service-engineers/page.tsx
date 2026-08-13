import type { Metadata } from "next";
import IndustryLanding from "@/Components/marketing/industry-landing";

export const metadata: Metadata = {
  title: "Field service software for mobile agricultural engineers",
  description: "Mobile job cards, travel, labour, parts, photos, signatures and machine history for agricultural engineers working in the field.",
  alternates: { canonical: "/industries/mobile-service-engineers" },
};

export default function Page() {
  return <IndustryLanding
    eyebrow="Mobile agricultural engineers"
    title="Carry the job card, machine history and workshop back office in your phone."
    description="AgriCore Technician Pro is designed for engineers moving between farms, workshops and machinery rather than sitting behind a desk."
    pains={["Reduce paper job sheets and end-of-day re-entry.","See customer and machine information before arriving on site.","Capture labour, travel, parts, photos and signatures while the job is fresh.","Keep queued field work usable when signal is poor through offline-ready workflows."]}
    capabilities={[
      { title: "Technician Pro", description: "A mobile-first job workspace that keeps the operational controls engineers use most close at hand." },
      { title: "Travel & GPS", description: "Record journeys and field activity using company-configurable field-operations features." },
      { title: "Photos & signatures", description: "Attach evidence and customer sign-off directly to the job rather than sending it separately." },
      { title: "Parts & labour", description: "Record job consumption and time while the technician is still on the machine." },
      { title: "Offline-ready sync", description: "Queue supported field changes and bring them back into the platform when connectivity returns." },
      { title: "AI-assisted diagnostics", description: "Use machine and repair history as additional context while fault finding on site." },
    ]}
    outcomeTitle="Finish the job once—not again when you get home."
    outcomeCopy="The field workflow is designed to capture the information needed for office review and invoicing during the job, reducing the administrative clean-up that normally follows a day of callouts."
  />;
}
