import { requirePermission } from "@/lib/auth/require-permission";
import ManufacturersPageClient from "./manufacturers-page-client";

export const dynamic = "force-dynamic";

export default async function ManufacturersPage() {
  await requirePermission([
    "service_templates.view",
    "service_templates.manage",
  ]);

  return <ManufacturersPageClient />;
}
