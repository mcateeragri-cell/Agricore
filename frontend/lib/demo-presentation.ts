import type { CompanyOption } from "@/Components/navigation/navigation-types";

export type DemoPresentationIdentity = {
  name: string;
  email: string;
  title: string;
};

export type DemoTeamMember = {
  userId: string;
  name: string;
  role: string;
  status: "On site" | "Scheduled" | "Available";
};

const DEMO_MANAGERS = [
  "Alex Morgan",
  "Sam Bennett",
  "Chris Palmer",
  "Jordan Ellis",
  "Taylor Hughes",
  "Morgan Reed",
] as const;

const DEMO_TEAM_NAMES = [
  "Alex Morgan",
  "Sam Bennett",
  "Chris Palmer",
  "Jordan Ellis",
  "Taylor Hughes",
  "Morgan Reed",
  "Casey Ward",
  "Jamie Foster",
] as const;

const DEMO_TEAM_ROLES = [
  "Service Manager",
  "Field Service Engineer",
  "Agricultural Technician",
  "Workshop Technician",
  "Service Coordinator",
  "Apprentice Technician",
] as const;

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

export function isDemoCompany(company: CompanyOption | null | undefined) {
  if (!company) return false;
  const slug = String(company.slug ?? "").toLowerCase();
  const name = String(company.name ?? "").toLowerCase();
  return slug.startsWith("demo-") || /\bdemo\b/.test(name);
}

export function getDemoPresentationIdentity(company: CompanyOption | null | undefined): DemoPresentationIdentity | null {
  if (!isDemoCompany(company)) return null;
  const seed = hash(`${company?.id ?? ""}:${company?.slug ?? ""}`);
  const name = DEMO_MANAGERS[seed % DEMO_MANAGERS.length];
  return {
    name,
    email: `demo-manager-${String(seed % 10000).padStart(4, "0")}@example.invalid`,
    title: "Service Manager",
  };
}

export function getDemoTeam(company: CompanyOption | null | undefined): DemoTeamMember[] {
  if (!isDemoCompany(company)) return [];
  const seed = hash(`${company?.id ?? ""}:${company?.slug ?? ""}:team`);

  return Array.from({ length: 6 }, (_, index) => {
    const name = DEMO_TEAM_NAMES[(seed + index * 3) % DEMO_TEAM_NAMES.length];
    const role = DEMO_TEAM_ROLES[index % DEMO_TEAM_ROLES.length];
    const status = (["On site", "Scheduled", "Available", "On site", "Available", "Scheduled"] as const)[(seed + index) % 6];
    return {
      userId: `demo-team-${company?.id ?? "workspace"}-${index + 1}`,
      name,
      role,
      status,
    };
  });
}
