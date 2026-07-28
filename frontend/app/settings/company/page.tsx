import CompanyBrandingForm from "@/Components/settings/company-branding-form";

export default function CompanySettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      

      <main className="lg:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-sm font-medium text-emerald-800">Settings</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Company branding
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              These details will be used on invoices, service reports, quotes and
              customer emails.
            </p>
          </div>

          <CompanyBrandingForm />
        </div>
      </main>
    </div>
  );
}
