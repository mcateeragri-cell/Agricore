import type { Metadata } from "next";
import SearchLanding from "@/Components/marketing/search-landing";

export const metadata: Metadata = {
  title: 'Agricultural CRM Software | AgriCore',
  description: 'Agricultural CRM software that connects customers to machines, service history, jobs, technicians, quotes and invoices instead of treating every asset as a note.',
  alternates: { canonical: "/agricultural-crm" },
};

export default function Page() {
  return (
    <SearchLanding
      eyebrow='Agricultural CRM software'
      title='A CRM that understands the customer owns machines, not just contact details.'
      description='AgriCore keeps customer relationships tied to tractors, loaders, implements and equipment service history, so the office and technicians work from the same operational record.'
      audience='agricultural engineers, machinery dealers and service workshops'
      pains={[
      'Keep every machine, serial number, hour reading and service record against the right customer.',
      'See previous faults and repairs before the next callout starts.',
      'Move from enquiry to job, quote and invoice without rebuilding customer information.',
      'Give office and field teams one shared customer and machine history.',
      ]}
      benefits={[
      { title: 'Customer records', description: 'Keep contacts, addresses, account information and working history together.' },
      { title: 'Machine relationships', description: 'Attach multiple tractors, machines and implements to each customer.' },
      { title: 'Service history', description: 'See jobs, faults, parts, hours and maintenance events in context.' },
      { title: 'Job workflow', description: 'Create and assign work directly from the customer or machine record.' },
      { title: 'Commercial history', description: 'Keep quotes and invoices connected to the work that created them.' },
      { title: 'Team visibility', description: 'Give authorised office and field staff the same current record.' },
      ]}
      secondaryTitle='See what an agricultural CRM looks like when machines are first-class records.'
      secondaryCopy='Explore the read-only AgriCore demo with synthetic customers, machines and jobs before you create your own workspace.'
    />
  );
}
