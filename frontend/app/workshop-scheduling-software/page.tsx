import type { Metadata } from "next";
import SearchLanding from "@/Components/marketing/search-landing";

export const metadata: Metadata = {
  title: 'Agricultural Workshop Scheduling Software | AgriCore',
  description: 'Workshop scheduling software for agricultural engineers: plan workshop jobs, field callouts and technician workload alongside machine and customer history.',
  alternates: { canonical: "/workshop-scheduling-software" },
};

export default function Page() {
  return (
    <SearchLanding
      eyebrow='Workshop scheduling software'
      title='See workshop work, field callouts and technician capacity in one service schedule.'
      description='AgriCore connects scheduling to the actual job, customer and machine so the calendar is more than a list of appointments—it is part of the service workflow.'
      audience='agricultural workshops, service managers and machinery dealers'
      pains={[
      'See which jobs are planned, active, waiting or ready for review.',
      'Assign technicians without losing the machine history they need for the job.',
      'Coordinate field callouts and workshop work from the same operating system.',
      'Keep service-due work visible before it becomes another urgent phone call.',
      ]}
      benefits={[
      { title: 'Shared calendar', description: 'Keep planned service work visible to the office and authorised team members.' },
      { title: 'Dispatch', description: 'Assign and coordinate field engineers from live job records.' },
      { title: 'Workshop planning', description: 'See work moving through the workshop rather than relying on a whiteboard alone.' },
      { title: 'Service programmes', description: 'Surface recurring maintenance and upcoming service demand.' },
      { title: 'Machine context', description: 'Open the job with the correct customer and machine already connected.' },
      { title: 'Technician workflow', description: 'Move scheduled work directly into the field completion process.' },
      ]}
      secondaryTitle='Explore the scheduling and job workflow before changing your current process.'
      secondaryCopy='The public demo is read-only and uses synthetic data, so you can inspect how jobs, technicians and machines fit together.'
    />
  );
}
