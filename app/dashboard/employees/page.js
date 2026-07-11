// app/dashboard/employees/page.js
import { redirect } from "next/navigation";

export default function EmployeeDashboardRoot() {
  // Redirect employees straight to the attendance punch page as their daily homepage
  redirect("/dashboard/employees/attendance");
}
