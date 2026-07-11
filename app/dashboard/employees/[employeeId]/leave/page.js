// app/dashboard/employees/[employeeId]/leave/page.js
import ApplyLeaveForm from "@/components/dashboard/employee/apply-leave-form";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  return {
    title: `Apply Leaves | TaskFlow`,
    description: `Manage leave balances and apply for leaves for worker ID: ${resolvedParams.employeeId}`,
  };
}

export default async function EmployeeLeavePage({ params }) {
  const resolvedParams = await params;
  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Leave Management</h1>
        <p className="text-xs text-zinc-500">Apply for leaves or track historical leave requests.</p>
      </div>
      <ApplyLeaveForm employeeId={resolvedParams.employeeId} />
    </div>
  );
}
