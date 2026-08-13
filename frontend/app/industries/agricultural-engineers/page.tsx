import type { Metadata } from "next";
import IndustryLanding from "@/Components/marketing/industry-landing";

export const metadata: Metadata = {
  title: "Software for agricultural engineers",
  description: "Job management, machine history, service programmes, stock, invoicing and AI-assisted fault finding for agricultural engineering businesses.",
  alternates: { canonical: "/industries/agricultural-engineers" },
};

export default function Page() {
  return <IndustryLanding
    eyebrow="Agricultural engineering software"
    title="Run workshop jobs, field callouts and machine history without the paperwork chase."
    description="AgriCore connects the customer, machine, technician, job card, parts, labour, service history and invoice so agricultural engineering businesses can work from one source of truth."
    pains={["Stop rebuilding the same customer and machine information on every job.","Give technicians the previous repair history before they start fault finding.","Move completed work into quotes and invoices without retyping the job.","Keep service reminders, stock and purchasing visible to the office team."]}
    capabilities={[
      { title: "Digital job cards", description: "Field and workshop jobs with technician assignment, labour, parts, photos, signatures and completion." },
      { title: "Machine-first history", description: "Keep make, model, serial number, hours, service programmes, faults and previous repairs attached to the machine." },
      { title: "AI Workshop Assistant", description: "Use company machine and job history as context for AI-assisted fault-finding guidance while keeping manufacturer verification explicit." },
      { title: "Stock & purchasing", description: "Track parts, suppliers, purchase orders, receipts and stock movements alongside the jobs consuming them." },
      { title: "Quotes & invoices", description: "Turn real operational records into professional customer documents with less duplicate entry." },
      { title: "Mobile technician workflow", description: "Give engineers a phone-friendly workflow for callouts, travel, labour, parts, evidence and sign-off." },
    ]}
    outcomeTitle="Software that understands a machine is more than a contact record."
    outcomeCopy="AgriCore was designed around agricultural service work, so the operational history your engineers need is available where the work happens rather than buried in a generic CRM."
  />;
}
