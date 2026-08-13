import type { Metadata } from "next";
import SearchLanding from "@/Components/marketing/search-landing";

export const metadata: Metadata = {
  title: "Mobile Job Sheets for Agricultural Engineers",
  description: "Digital mobile job sheets for agricultural engineers with machine history, labour, parts, photos, signatures and offline-ready field workflows.",
  alternates: { canonical: "/mobile-job-sheets-agricultural-engineers" },
};

export default function Page() {
  return <SearchLanding
    eyebrow="Mobile job sheets for agricultural engineers"
    title="Give field engineers the job information they need on their phone."
    description="Technician Pro keeps travel, labour, parts, photos, signatures, machine history and job completion connected to the office workflow—even when engineers spend most of the day away from the workshop."
    audience="mobile agricultural service engineers"
    pains={[
      "Replace handwritten job sheets that need re-entered at the office.",
      "Keep photos, parts and signatures on the same job record.",
      "Give the engineer previous machine history before diagnosis begins.",
      "Use offline-ready workflows where field signal is unreliable.",
    ]}
    benefits={[
      { title: "Digital job cards", description: "Open the assigned job, review the customer and machine, and record the work from a phone." },
      { title: "Travel & labour", description: "Keep technician travel and labour entries attached to the job rather than separate paperwork." },
      { title: "Parts used", description: "Record job parts while the machine is being repaired and preserve the service record." },
      { title: "Photos & signatures", description: "Capture evidence and customer sign-off directly against the completed job." },
      { title: "Offline-ready workflow", description: "Queue supported field actions when connectivity is poor and sync when service returns." },
      { title: "AI Workshop Assistant", description: "Use recorded machine and job context to support fault-finding while keeping manufacturer verification required." },
    ]}
    secondaryTitle="Try the field-service workflow before rollout."
    secondaryCopy="Explore the synthetic demo first, then start a trial when you are ready to put your own customers, machines and engineers into the workflow."
  />;
}
