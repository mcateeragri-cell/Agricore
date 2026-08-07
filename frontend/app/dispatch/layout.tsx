import FieldRolePageGate from "@/Components/auth/field-role-page-gate";

export default function OfficeAreaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <FieldRolePageGate>{children}</FieldRolePageGate>
  );
}
