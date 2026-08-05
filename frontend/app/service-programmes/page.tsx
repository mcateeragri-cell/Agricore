import ServiceProgrammesClient from "@/Components/service-programmes/service-programmes-client";
import { requirePermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function ServiceProgrammesPage() {
  const context = await requirePermission([
    "service_programmes.view",
    "service_programmes.manage",
  ]);

  const canManage =
    context.platformRole === "super_admin" ||
    context.platformRole === "platform_admin" ||
    context.role === "company_admin" ||
    context.role === "administrator" ||
    context.permissions.includes("service_programmes.manage");

  return <ServiceProgrammesClient canManage={canManage} />;
}
