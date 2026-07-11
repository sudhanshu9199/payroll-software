// app/dashboard/admin/employees/new/page.js
import OnboardingWizard from "@/components/dashboard/admin/onboarding/onboarding-wizard";

export const metadata = {
  title: "Onboard Employee | TaskFlow",
  description: "Add a new employee and configure salary, compliance, and location parameters.",
};

export default function OnboardEmployeePage() {
  return (
    <div className="mx-auto max-w-3xl py-4 px-2">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-zinc-950 tracking-tight">Onboard New Employee</h1>
        <p className="text-sm text-zinc-500">Configure legal records, salary structures, bank routing, and shifts.</p>
      </div>
      <OnboardingWizard />
    </div>
  );
}
