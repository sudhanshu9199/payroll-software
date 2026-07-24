// app/dashboard/admin/employees/page.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import EmployeeProfileModal from "@/components/dashboard/admin/EmployeeProfileModal";
import EmployeeExitModal from "@/components/dashboard/admin/EmployeeExitModal";

export default function AdminEmployeesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // "All" | "Active" | "Exited"
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [exitEmployeeId, setExitEmployeeId] = useState(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
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
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleReinstate = async (empId, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to re-instate this employee back to Active status?")) return;
    try {
      const res = await fetch(`/api/v1/employees/${empId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reinstate" }),
      });
      if (res.ok) {
        await fetchEmployees();
      }
    } catch (err) {
      alert("Failed to reinstate employee.");
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.phone || emp.phoneNumber || "").includes(searchTerm);

    if (statusFilter === "Active") return matchesSearch && emp.status === "Active";
    if (statusFilter === "Exited") return matchesSearch && emp.status === "Exited";
    return matchesSearch;
  });

  const activeCount = employees.filter((e) => e.status === "Active").length;
  const exitedCount = employees.filter((e) => e.status === "Exited").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 tracking-tight">Staff Management</h1>
          <p className="text-sm text-zinc-500">
            View 360° employee profiles, manage appointment documents, and process FnF offboarding.
          </p>
        </div>
        <Link
          href="/dashboard/admin/employees/new"
          className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-lg shadow-sm"
        >
          Add New Employee
        </Link>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Search & Status Filters Bar */}
        <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by name, role or phone..."
              className="w-full sm:w-72 px-3.5 py-2 border rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Filter Pills */}
            <div className="flex bg-zinc-100 p-1 rounded-xl text-xs font-semibold text-zinc-600">
              <button
                onClick={() => setStatusFilter("All")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === "All" ? "bg-white text-zinc-900 shadow-sm" : "hover:text-zinc-900"
                }`}
              >
                All ({employees.length})
              </button>
              <button
                onClick={() => setStatusFilter("Active")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === "Active" ? "bg-white text-emerald-700 shadow-sm" : "hover:text-zinc-900"
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter("Exited")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === "Exited" ? "bg-white text-rose-700 shadow-sm" : "hover:text-zinc-900"
                }`}
              >
                Exited ({exitedCount})
              </button>
            </div>
          </div>

          <span className="text-xs text-zinc-500 font-medium">
            Showing <strong className="text-zinc-900">{filteredEmployees.length}</strong> Staff Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-100">
                <th className="py-3.5 px-5">Employee Name</th>
                <th className="py-3.5 px-5">Role & Department</th>
                <th className="py-3.5 px-5">Documents & Resume</th>
                <th className="py-3.5 px-5">Joining Date</th>
                <th className="py-3.5 px-5 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-900">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm text-zinc-500 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading employee records...
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm text-zinc-500 font-semibold">
                    No employees found matching status filter and search criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const empId = emp._id || emp.id;
                  const hasResume = !!emp.documents?.resumeUrl;
                  const isActive = emp.status === "Active";

                  return (
                    <tr
                      key={empId}
                      className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedEmployeeId(empId)}
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 rounded-xl font-extrabold flex items-center justify-center text-xs border ${
                              isActive
                                ? "bg-indigo-600/10 text-indigo-700 border-indigo-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {emp.name ? emp.name.substring(0, 2).toUpperCase() : "EM"}
                          </div>
                          <div>
                            <span className="text-zinc-950 font-bold block">{emp.name}</span>
                            <span className="text-xs text-zinc-400 font-normal">{emp.phone || emp.phoneNumber}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <span className="text-zinc-900 font-semibold block">{emp.role}</span>
                        <span className="text-xs text-zinc-400 font-normal">{emp.department || "General"}</span>
                      </td>

                      <td className="py-4 px-5">
                        {hasResume ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                            📄 Resume Attached
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-500">
                            No Resume
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-zinc-600 text-xs">{emp.joiningDate || "N/A"}</td>

                      <td className="py-4 px-5 text-center">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedEmployeeId(empId)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                        >
                          360° Profile
                        </button>

                        {isActive ? (
                          <button
                            onClick={() => setExitEmployeeId(empId)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg shadow-sm transition-all"
                          >
                            Exit & FnF
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleReinstate(empId, e)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg shadow-sm transition-all"
                          >
                            Re-instate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Render 360° Profile Modal when an employee is selected */}
      {selectedEmployeeId && (
        <EmployeeProfileModal
          employeeId={selectedEmployeeId}
          onClose={() => setSelectedEmployeeId(null)}
          onRefresh={fetchEmployees}
        />
      )}

      {/* Render Employee Exit & FnF Audit Modal when exit button is clicked */}
      {exitEmployeeId && (
        <EmployeeExitModal
          employeeId={exitEmployeeId}
          onClose={() => setExitEmployeeId(null)}
          onSuccess={fetchEmployees}
        />
      )}
    </div>
  );
}


