// app/dashboard/employees/attendance/page.js
import PunchButton from "@/components/dashboard/employee/punch-button";

export const metadata = {
  title: "Mark Attendance | TaskFlow",
  description: "Mark your daily attendance securely with geofenced location logging.",
};

export default function EmployeeAttendancePage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Attendance Center</h1>
        <p className="text-xs text-zinc-500">Log your entry and exit within branch coordinates.</p>
      </div>
      <PunchButton />
    </div>
  );
}
