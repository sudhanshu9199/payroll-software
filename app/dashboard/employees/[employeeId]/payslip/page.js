// app/dashboard/employees/[employeeId]/payslip/page.js
import PayslipList from "@/components/dashboard/employee/payslip-list";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  return {
    title: `Salary Slips | TaskFlow`,
    description: `View or download itemized payslips for worker ID: ${resolvedParams.employeeId}`,
  };
}

export default async function EmployeePayslipPage({ params }) {
  const resolvedParams = await params;
  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Payslip Center</h1>
        <p className="text-xs text-zinc-500">Access itemized salary breakdowns and PDF downloads.</p>
      </div>
      <PayslipList employeeId={resolvedParams.employeeId} />
    </div>
  );
}
