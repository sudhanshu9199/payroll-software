// app/dashboard/admin/employees/page.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminEmployeesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await fetch("/api/v1/employees");
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.employees || []);
        }
      } catch (err) {
        console.error("Failed to load employees:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 tracking-tight">Staff Management</h1>
          <p className="text-sm text-zinc-500">Add, edit, or manage payroll settings for your staff.</p>
        </div>
        <Link
          href="/dashboard/admin/employees/new"
          className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-lg shadow-sm"
        >
          Add New Employee
        </Link>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search staff..."
              className="w-full px-3.5 py-1.5 border rounded-lg text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-100">
                <th className="py-3 px-5">Name</th>
                <th className="py-3 px-5">Role</th>
                <th className="py-3 px-5">Phone Number</th>
                <th className="py-3 px-5">Joining Date</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-900">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-sm text-zinc-500 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-zinc-900" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading employees...
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-sm text-zinc-500 font-semibold">
                    No employees found. Click "Add New Employee" to onboard your staff.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-50/50">
                    <td className="py-4 px-5 text-zinc-950 font-bold">{emp.name}</td>
                    <td className="py-4 px-5 text-zinc-500">{emp.role}</td>
                    <td className="py-4 px-5">{emp.phone}</td>
                    <td className="py-4 px-5 text-zinc-500">{emp.joiningDate}</td>
                    <td className="py-4 px-5 text-center">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        emp.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-zinc-100 text-zinc-600 border-zinc-200"
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right space-x-2">
                      <button
                        onClick={() => alert(`Editing profile of ${emp.name}`)}
                        className="text-xs font-bold text-zinc-600 hover:text-zinc-950 px-2.5 py-1.5 border rounded-lg hover:bg-zinc-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => alert(`Marking exit and generating final payout (FnF) for ${emp.name}`)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-1.5 border border-rose-200 hover:bg-rose-50 rounded-lg"
                      >
                        Exit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
