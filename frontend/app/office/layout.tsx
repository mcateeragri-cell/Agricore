import FieldRolePageGate from "@/Components/auth/field-role-page-gate";

export default function OfficeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <FieldRolePageGate>{children}</FieldRolePageGate>;
}
