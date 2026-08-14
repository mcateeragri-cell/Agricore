import { requirePermission } from "@/lib/auth/require-permission";
import ModuleSettingsClient from "./module-settings-client";

export default async function ModulesPage() {
  await requirePermission(["settings.manage"]);
  return <ModuleSettingsClient />;
}
