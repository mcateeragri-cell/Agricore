import type { Metadata } from "next";
import SearchLanding from "@/Components/marketing/search-landing";

export const metadata: Metadata = {
  title: 'Agricultural Invoicing Software | AgriCore',
  description: 'Agricultural invoicing software that turns completed machinery jobs, technician labour and parts into professional invoices without retyping the job card.',
  alternates: { canonical: "/agricultural-invoicing-software" },
};

export default function Page() {
  return (
    <SearchLanding
      eyebrow='Agricultural invoicing software'
      title='Turn completed machinery work into invoices without rebuilding the job.'
      description='AgriCore carries customer, machine, labour, parts and technician notes through the service workflow so the office can review completed work and invoice from the same operational record.'
      audience='agricultural workshops and mobile service businesses'
      pains={[
      'Stop copying technician notes from paper job sheets into a separate invoice system.',
      'Keep labour and parts traceable back to the job and machine.',
      'Produce clear customer invoices with job and machine context.',
      'See outstanding balances alongside the operational work that generated them.',
      ]}
      benefits={[
      { title: 'Job-to-invoice workflow', description: 'Review completed work and create the invoice from the job record.' },
      { title: 'Labour capture', description: 'Carry recorded technician labour into the commercial workflow.' },
      { title: 'Parts used', description: 'Keep consumed parts attached to the job rather than a separate handwritten list.' },
      { title: 'Machine context', description: 'Show the machine and job reference customers expect on service invoices.' },
      { title: 'Payment tracking', description: 'Monitor invoice status, outstanding balances and supported payment links.' },
      { title: 'Professional PDFs', description: 'Generate consistent invoice documents from your company workspace.' },
      ]}
      secondaryTitle='Follow the path from a completed job to a customer invoice.'
      secondaryCopy='Use the live read-only demo to inspect the AgriCore invoice workflow with synthetic service data.'
    />
  );
}
