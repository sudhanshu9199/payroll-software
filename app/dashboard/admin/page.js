// app/dashboard/admin/page.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [leavesModalOpen, setLeavesModalOpen] = useState(false);
  const [dryRunOpen, setDryRunOpen] = useState(false);
  const [payrollStatus, setPayrollStatus] = useState("DRAFT"); // "DRAFT" or "LOCKED"
  
  // Pending leaves state
  const [pendingLeaves, setPendingLeaves] = useState([
    { id: 1, name: "Rahul Verma", role: "Cleaner", type: "Unpaid Leave", dates: "14 Jun - 15 Jun", days: 2 },
    { id: 2, name: "Amit Kumar", role: "Head Cook", type: "Sick Leave", dates: "18 Jun - 18 Jun", days: 1 },
  ]);

  // Employee Quick List
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

  const totalEstimatedPayroll = employees.reduce((sum, emp) => sum + (emp.basePay || 0), 0);
  const totalAdvances = employees.reduce((sum, emp) => sum + (emp.advances || 0), 0);
  const activeStaffCount = employees.filter(emp => emp.status === "Active").length;

  // Handle leave approval
  const handleLeaveApproval = (id, approved) => {
    // In a real application, this triggers PATCH /api/v1/leaves/:id/status
    setPendingLeaves(prev => prev.filter(leave => leave.id !== id));
  };

  const handleLockPayroll = () => {
    setDryRunOpen(false);
    setPayrollStatus("LOCKED");
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 tracking-tight">Command Center</h1>
          <p className="text-sm text-zinc-500">Run payroll, clear leave approvals, and review active balances.</p>
        </div>
      </div>

      {/* Quick Insights Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Total Estimated Payroll</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-950">₹{totalEstimatedPayroll.toLocaleString("en-IN")}</span>
          </div>
          <span className="text-[10px] text-zinc-400 block">Based on active salary parameters</span>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Advances to Recover</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-950">₹{totalAdvances.toLocaleString("en-IN")}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-medium block">✓ Deductions queued for payslips</span>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Staff Timeline</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-950">{activeStaffCount} Active</span>
          </div>
          <span className="text-[10px] text-zinc-400 block">{employees.length - activeStaffCount} exited/inactive records</span>
        </div>
      </div>

      {/* The Main Action Area */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-lg font-bold text-zinc-900">
            {payrollStatus === "LOCKED" ? "June 2026 Payroll Processed" : "Ready to process June 2026?"}
          </h2>
          <p className="text-sm text-zinc-500">
            {payrollStatus === "LOCKED"
              ? "All payslips have been locked. Notifications sent to employees."
              : `Attendance logs finalized. ${pendingLeaves.length} pending leave request${pendingLeaves.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        
        <div className="flex gap-3">
          {payrollStatus === "LOCKED" ? (
            <>
              <button
                onClick={() => alert("WhatsApp notification dispatch queued.")}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-lg shadow-sm"
              >
                Send via WhatsApp
              </button>
              <button
                onClick={() => alert("Downloading CSV file for bulk bank transfers.")}
                className="px-4 py-2.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-lg"
              >
                Export Bank File
              </button>
            </>
          ) : (
            <>
              {pendingLeaves.length > 0 && (
                <button
                  onClick={() => setLeavesModalOpen(true)}
                  className="px-4 py-2.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-lg"
                >
                  Review Leaves ({pendingLeaves.length})
                </button>
              )}
              <button
                onClick={() => setDryRunOpen(true)}
                disabled={pendingLeaves.length > 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:border-zinc-200 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm"
              >
                GENERATE PAYROLL
              </button>
            </>
          )}
        </div>
      </div>

      {/* Employee Quick List */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="font-bold text-zinc-900">Employee List</h3>
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Find employee..."
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
                <th className="py-3 px-5 text-center">Present Days</th>
                <th className="py-3 px-5 text-right">Advances</th>
                <th className="py-3 px-5 text-right">Monthly Net Pay</th>
                <th className="py-3 px-5 text-center">Status</th>
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
                    No employees found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const base = emp.basePay || 0;
                  const adv = emp.advances || 0;
                  const netPay = base - adv;

                  return (
                    <tr key={emp.id} className="hover:bg-zinc-50/50">
                      <td className="py-4 px-5 text-zinc-950 font-bold">{emp.name}</td>
                      <td className="py-4 px-5 text-zinc-500">{emp.role}</td>
                      <td className="py-4 px-5 text-center text-zinc-900">{emp.attendance}</td>
                      <td className="py-4 px-5 text-right text-rose-600">
                        {adv > 0 ? `-₹${adv.toLocaleString("en-IN")}` : "₹0"}
                      </td>
                      <td className="py-4 px-5 text-right text-zinc-950 font-bold">
                        ₹{netPay.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            emp.status === "Active" || payrollStatus === "LOCKED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}
                        >
                          {payrollStatus === "LOCKED" ? "Processed" : emp.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Review Leaves Modal */}
      {leavesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-bold text-zinc-950">Review Leave Requests</h3>
              <button onClick={() => setLeavesModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {pendingLeaves.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">All leave requests resolved.</p>
            ) : (
              <div className="divide-y max-h-80 overflow-y-auto pr-1">
                {pendingLeaves.map((leave) => (
                  <div key={leave.id} className="py-4 space-y-2 first:pt-0 last:pb-0">
                    <div className="flex justify-between">
                      <div>
                        <span className="font-bold text-zinc-900 block text-sm">{leave.name}</span>
                        <span className="text-xs text-zinc-400">{leave.role} | {leave.type}</span>
                      </div>
                      <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-full self-start">
                        {leave.days} Days ({leave.dates})
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLeaveApproval(leave.id, true)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                      >
                        Approve (Paid)
                      </button>
                      <button
                        onClick={() => handleLeaveApproval(leave.id, false)}
                        className="flex-1 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-lg"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setLeavesModalOpen(false)}
              className="w-full py-2 border rounded-lg text-sm font-semibold hover:bg-zinc-50"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 2. Dry Run Payroll Slider/Drawer */}
      {dryRunOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="bg-white h-full w-full max-w-lg p-6 shadow-2xl flex flex-col justify-between border-l border-zinc-200 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-zinc-950 tracking-tight">June 2026 Dry Run Preview</h3>
                  <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                    Preview Mode (No changes committed)
                  </span>
                </div>
                <button onClick={() => setDryRunOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Individual breakdowns */}
              <div className="space-y-4 divide-y">
                {employees.map((emp) => {
                  const base = emp.basePay || 0;
                  const adv = emp.advances || 0;
                  const net = base - adv;
                  return (
                    <div key={emp.id} className="space-y-2 py-2 first:pt-0">
                      <div className="flex justify-between font-bold">
                        <span className="text-zinc-900 text-sm">{emp.name} ({emp.role})</span>
                        <span className="text-zinc-900 text-sm">₹{net.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="text-xs text-zinc-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Base Salary</span>
                          <span>₹{base.toLocaleString("en-IN")}</span>
                        </div>
                        {adv > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>Advance Deducted</span>
                            <span>-₹{adv.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Aggregation */}
              <div className="bg-zinc-50 border rounded-xl p-4 space-y-2 mt-6">
                <div className="flex justify-between text-xs text-zinc-500 font-semibold">
                  <span>Gross Payout ({employees.length} Staff)</span>
                  <span>₹{totalEstimatedPayroll.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-xs text-rose-600 font-semibold">
                  <span>Advance Deductions</span>
                  <span>-₹{totalAdvances.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-dashed pt-2 text-zinc-950">
                  <span>Total Cash Required</span>
                  <span>₹{(totalEstimatedPayroll - totalAdvances).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t mt-6">
              <button
                onClick={() => setDryRunOpen(false)}
                className="flex-1 py-2.5 border rounded-lg text-sm font-semibold hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLockPayroll}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm"
              >
                Confirm & Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
