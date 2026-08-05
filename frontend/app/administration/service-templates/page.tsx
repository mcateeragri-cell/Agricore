import { requirePermission } from "@/lib/auth/require-permission";
import ServiceTemplatesPageClient from "./service-templates-page-client";

export const dynamic = "force-dynamic";

export default async function ServiceTemplatesPage() {
  await requirePermission([
    "service_templates.view",
    "service_templates.manage",
    "service_templates.approve",
  ]);

  return <ServiceTemplatesPageClient />;
}
