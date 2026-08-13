import type { Metadata } from "next";
import SearchLanding from "@/Components/marketing/search-landing";

export const metadata: Metadata = {
  title: 'Software for Agricultural Engineers | AgriCore',
  description: 'Software for agricultural engineers covering customers, machinery, jobs, field technicians, stock, service programmes, quotes, invoices and AI-assisted fault finding.',
  alternates: { canonical: "/agricultural-engineer-software" },
};

export default function Page() {
  return (
    <SearchLanding
      eyebrow='Software for agricultural engineers'
      title='One operating system for the workshop, the van and the office.'
      description='AgriCore is built around the way independent agricultural engineers and service teams actually work—from the first customer call to machine history, job completion and invoicing.'
      audience='independent agricultural engineers and growing service businesses'
      pains={[
      'Replace paper job sheets and scattered spreadsheets with connected records.',
      'Keep every machine and previous repair visible when the next fault comes in.',
      'Give technicians a practical phone workflow without exposing unnecessary office controls.',
      'Keep stock, service work, quoting and invoicing connected as the business grows.',
      ]}
      benefits={[
      { title: 'Customers & machines', description: 'Build a service history around the equipment you actually repair.' },
      { title: 'Jobs', description: 'Create, assign, complete and review workshop and callout work.' },
      { title: 'Technician Pro', description: 'Capture the field record from travel through to customer sign-off.' },
      { title: 'Stock', description: 'Track workshop parts, suppliers and purchasing activity.' },
      { title: 'Commercial workflow', description: 'Move through quotes, completed jobs and invoices in one platform.' },
      { title: 'AI Workshop Assistant', description: 'Use machine history as context for advisory fault-finding support.' },
      ]}
      secondaryTitle='See AgriCore working before you move a single customer record.'
      secondaryCopy='The interactive demo uses synthetic agricultural engineering data and requires no account.'
    />
  );
}
