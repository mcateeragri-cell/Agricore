import { requirePermission } from "@/lib/auth/require-permission";
import TransferCentreClient from "./transfer-centre-client";
export const dynamic="force-dynamic";
export default async function TransferCentrePage(){await requirePermission(["settings.manage","jobs.assign"]);return <TransferCentreClient/>;}
