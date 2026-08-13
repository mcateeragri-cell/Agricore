import type { Metadata } from "next";
import SearchLanding from "@/Components/marketing/search-landing";

export const metadata: Metadata = {
  title: 'Agricultural Field Service Management Software | AgriCore',
  description: 'Field service management software for agricultural engineers with mobile job cards, travel, labour, parts, photos, signatures, GPS and machine history.',
  alternates: { canonical: "/field-service-management-agriculture" },
};

export default function Page() {
  return (
    <SearchLanding
      eyebrow='Agricultural field service management'
      title='Give mobile engineers the job, machine history and completion tools in one workflow.'
      description='AgriCore is designed for service businesses where the work happens at farms, yards and customer sites as often as it happens in the workshop.'
      audience='mobile agricultural engineers and field service teams'
      pains={[
      'Give the technician customer and machine information before they arrive on site.',
      'Record travel, labour, parts, photos and signatures against the job while the work is fresh.',
      'Keep field updates connected to the office instead of returning with loose paperwork.',
      'Use offline-ready workflows where mobile signal is unreliable.',
      ]}
      benefits={[
      { title: 'Mobile job cards', description: 'Use a phone-first technician workflow built around real field service work.' },
      { title: 'Travel & labour', description: 'Capture time against the job instead of reconstructing it later.' },
      { title: 'Parts & photos', description: 'Record what was fitted and document the work on site.' },
      { title: 'Digital signatures', description: 'Capture job completion and customer sign-off in the same workflow.' },
      { title: 'Machine history', description: 'Give engineers previous service and fault context before diagnosis starts.' },
      { title: 'Offline-ready', description: 'Queue field updates when connectivity is poor and sync when available.' },
      ]}
      secondaryTitle='Try the mobile-service workflow without creating an account.'
      secondaryCopy='Explore a safe read-only demo before starting a 14-day trial with your own engineers and machines.'
    />
  );
}
