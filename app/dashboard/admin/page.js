// app/dashboard/admin/page.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [leavesModalOpen, setLeavesModalOpen] = useState(false);
  const [dryRunOpen, setDryRunOpen] = useState(false);
  const [payrollStatus, setPayrollStatus] = useState("DRAFT"); // "DRAFT", "PROCESSING", or "LOCKED"
  const [isGenerating, setIsGenerating] = useState(false);
  const [dryRunData, setDryRunData] = useState(null); // Holds live API calculations
  const [payrollJobId, setPayrollJobId] = useState(null); // Tracks async processing
  
  // Real leaves state
  const [leaves, setLeaves] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);

  // Employee Quick List
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Derived pending leaves
  const pendingLeaves = leaves.filter((leave) => leave.status === "Pending");

  // Fetch leaves from database
  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/v1/leaves");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLeaves(data.leaves || []);
        }
      }
    } catch (err) {
      console.error("Failed to load leaves:", err);
    }
  };

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
    fetchLeaves();
  }, []);

  useEffect(() => {
    if (!employees || employees.length === 0) return;
    const businessId = employees[0]?.businessId;
    if (!businessId) return;

    async function checkPayrollStatus() {
      try {
        const res = await fetch(`/api/v1/payroll/generate?businessId=${businessId}&month=6&year=2026`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.status === "LOCKED") {
            setPayrollStatus("LOCKED");
            setDryRunData(data.payroll);
          }
        }
      } catch (err) {
        console.error("Failed to check payroll status:", err);
      }
    }
    checkPayrollStatus();
  }, [employees]);

  const totalEstimatedPayroll = employees.reduce((sum, emp) => sum + (emp.basePay || 0), 0);
  const totalAdvances = employees.reduce((sum, emp) => sum + (emp.advances || 0), 0);
  const activeStaffCount = employees.filter(emp => emp.status === "Active").length;

  // Handle leave approval
  const handleLeaveApproval = async (id, approved) => {
    try {
      const res = await fetch(`/api/v1/leaves/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: approved ? "Approved" : "Rejected" }),
      });

      if (res.ok) {
        // Refresh leaves and employees lists on success
        await fetchLeaves();
        const empRes = await fetch("/api/v1/employees");
        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(empData.employees || []);
        }
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to update leave status.");
      }
    } catch (err) {
      console.error("Error updating leave:", err);
      alert("Network error. Could not update leave status.");
    }
  };

  const handleGeneratePayroll = async () => {
    setIsGenerating(true);
    try {
      const businessId = employees[0]?.businessId || "60b8d295f1d2c72b8c9b14f1"; 
      
      const res = await fetch("/api/v1/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          payPeriod: { month: 6, year: 2026 }, 
          options: { dryRun: true }
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setDryRunData(data.payroll);
        setDryRunOpen(true);
      } else {
        alert("Payroll Generation Failed: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Network error during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle polling when payrollJobId changes
  useEffect(() => {
    if (!payrollJobId) return;

    let intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/payroll/status?jobId=${payrollJobId}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.success) {
          if (data.state === "completed") {
            setPayrollStatus("LOCKED");
            setPayrollJobId(null);
            clearInterval(intervalId);

            // Fetch finalized payroll records to populate dryRunData
            const businessId = employees[0]?.businessId;
            if (businessId) {
              fetch(`/api/v1/payroll/generate?businessId=${businessId}&month=6&year=2026`)
                .then((r) => r.json())
                .then((d) => {
                  if (d.success && d.payroll) {
                    setDryRunData(d.payroll);
                  }
                })
                .catch((err) => console.error("Error fetching locked payroll records:", err));
            }
          } else if (data.state === "failed") {
            setPayrollStatus("DRAFT");
            setPayrollJobId(null);
            clearInterval(intervalId);
            alert(`Payroll processing failed: ${data.failedReason || "Unknown reason"}`);
          }
        }
      } catch (err) {
        console.error("Error polling job status:", err);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [payrollJobId]);

  const handleLockPayroll = async () => {
    setDryRunOpen(false);
    setPayrollStatus("PROCESSING"); 
    
    const businessId = employees[0]?.businessId;

    try {
      const res = await fetch("/api/v1/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          payPeriod: { month: 6, year: 2026 },
          options: { dryRun: false }
        })
      });
      
      const data = await res.json();
      if (res.status === 202 && data.jobId) {
        setPayrollJobId(data.jobId);
      } else {
        setPayrollStatus("DRAFT");
        alert("Failed to lock payroll: " + (data.error || "Queue rejected the job."));
      }
    } catch (error) {
      setPayrollStatus("DRAFT");
      alert("Failed to lock payroll.");
    }
  };

  const handleBankExport = () => {
    if (!dryRunData || dryRunData.length === 0) {
      alert("No finalized payroll data available to export.");
      return;
    }

    // Standard HDFC / ICICI Corporate Salary Upload Format
    const headers = [
      "Transaction Type",
      "Beneficiary Account Number",
      "Beneficiary Name",
      "Amount",
      "Payment Mode",
      "Email ID",
      "Transaction Date",
      "IFSC Code",
      "Remarks"
    ];

    const currentDate = new Date().toLocaleDateString('en-GB');

    const rows = dryRunData.map((empOutput) => {
      const empDetails = employees.find(e => e.id === empOutput.employeeId) || {};
      const bankDetails = empDetails.bankDetails || {};
      const transferType = empOutput.netPayable >= 200000 ? "RTGS" : "NEFT";
      
      return [
        transferType,
        bankDetails.accountNumber || "MISSING_AC", 
        empOutput.name,
        empOutput.netPayable,
        "ACC",
        empDetails.email || "",
        currentDate,
        bankDetails.ifscCode || "MISSING_IFSC",
        `Salary_${empOutput.payPeriod.month}_${empOutput.payPeriod.year}`
      ];
    });

    const escapeCSV = (str) => `"${String(str).replace(/"/g, '""')}"`;
    
    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(escapeCSV).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bank_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            {payrollStatus === "LOCKED" 
              ? "June 2026 Payroll Processed" 
              : payrollStatus === "PROCESSING" 
              ? "Processing June 2026..." 
              : "Ready to process June 2026?"}
          </h2>
          <p className="text-sm text-zinc-500">
            {payrollStatus === "LOCKED"
              ? "All payslips have been locked. Notifications sent to employees."
              : payrollStatus === "PROCESSING"
              ? "Processing database transactions and generating employee payslips in background..."
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
                onClick={handleBankExport}
                className="px-4 py-2.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-lg"
              >
                Export Bank File
              </button>
            </>
          ) : payrollStatus === "PROCESSING" ? (
            <div className="flex items-center gap-2 text-zinc-500 font-semibold text-sm">
              <svg className="animate-spin h-5 w-5 text-zinc-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Queueing background processing...
            </div>
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
                onClick={handleGeneratePayroll}
                disabled={pendingLeaves.length > 0 || isGenerating}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:border-zinc-200 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm"
              >
                {isGenerating ? "CALCULATING..." : "GENERATE PAYROLL"}
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
              <div className="divide-y divide-zinc-100 max-h-80 overflow-y-auto pr-1">
                {pendingLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    onClick={() => setSelectedLeave(leave)}
                    className="py-3 px-2 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors duration-150 space-y-1 first:mt-0"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-zinc-900 block text-sm hover:underline">{leave.name}</span>
                        <span className="text-xs text-zinc-500 font-medium">{leave.role}</span>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        {leave.days} {leave.days === 1 ? "Day" : "Days"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>{leave.type}</span>
                      <span className="font-medium text-zinc-500">{leave.dates}</span>
                    </div>
                    {leave.reason && (
                      <p className="text-[11px] text-zinc-400 truncate italic max-w-[280px]">
                        "{leave.reason}"
                      </p>
                    )}
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

      {/* 1b. Detailed Leave Review Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs transition-opacity duration-300">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-100 space-y-6 transform scale-100 transition-transform duration-300">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-black text-zinc-950">Leave Request Details</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Review credentials and quota balances</p>
              </div>
              <button
                onClick={() => setSelectedLeave(null)}
                className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Profile summary */}
            <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
              <div className="h-10 w-10 rounded-full bg-zinc-900 text-white font-black text-sm flex items-center justify-center shadow-inner">
                {selectedLeave.name.split(" ").map(n => n[0]).join("").toUpperCase()}
              </div>
              <div>
                <span className="font-extrabold text-zinc-950 block text-sm">{selectedLeave.name}</span>
                <span className="text-xs text-zinc-500 font-semibold">{selectedLeave.role}</span>
              </div>
            </div>

            {/* Request specifics */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-100">
                  <span className="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider block">Leave Type</span>
                  <span className="font-bold text-zinc-900 mt-1 block">{selectedLeave.type}</span>
                </div>
                <div className="bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-100">
                  <span className="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider block">Duration</span>
                  <span className="font-bold text-zinc-900 mt-1 block">{selectedLeave.days} {selectedLeave.days === 1 ? "Day" : "Days"}</span>
                </div>
              </div>

              <div className="bg-zinc-50/50 p-3 rounded-xl border border-zinc-100 text-xs">
                <span className="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider block mb-1">Requested Period</span>
                <span className="font-bold text-zinc-800 block">{selectedLeave.dates}</span>
              </div>

              {selectedLeave.reason && (
                <div className="bg-zinc-50/50 p-3.5 rounded-xl border border-zinc-100 text-xs space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider block">Reason</span>
                  <p className="text-zinc-700 italic leading-relaxed font-medium">
                    "{selectedLeave.reason}"
                  </p>
                </div>
              )}

              {/* Employee leave balances */}
              <div className="bg-zinc-50/30 p-4 rounded-2xl border border-zinc-150 space-y-3">
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Current Leave Quota Balances</span>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-zinc-200">
                    <span className="text-[10px] font-bold text-zinc-400 block">SICK</span>
                    <span className="text-base font-black text-emerald-600 mt-0.5 block">
                      {selectedLeave.leaveBalances?.sick ?? 5} / 5
                    </span>
                    <span className="text-[9px] text-zinc-400 mt-0.5 block">Available</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-zinc-200">
                    <span className="text-[10px] font-bold text-zinc-400 block">CASUAL</span>
                    <span className="text-base font-black text-sky-600 mt-0.5 block">
                      {selectedLeave.leaveBalances?.casual ?? 6} / 6
                    </span>
                    <span className="text-[9px] text-zinc-400 mt-0.5 block">Available</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={async () => {
                  await handleLeaveApproval(selectedLeave.id, true);
                  setSelectedLeave(null);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer text-center"
              >
                Approve (Paid)
              </button>
              <button
                onClick={async () => {
                  await handleLeaveApproval(selectedLeave.id, false);
                  setSelectedLeave(null);
                }}
                className="flex-1 py-3 border border-rose-250 bg-rose-50/50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 text-xs font-black rounded-xl transition-all cursor-pointer text-center"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Dry Run Payroll Slider/Drawer */}
      {dryRunOpen && dryRunData && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
          <div className="bg-white h-full w-full max-w-lg p-6 shadow-2xl flex flex-col justify-between border-l border-zinc-200 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-zinc-950 tracking-tight">June 2026 Dry Run Preview</h3>
                  <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {dryRunData.length} Records Calculated
                  </span>
                </div>
                <button onClick={() => setDryRunOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Dynamic Breakdowns populated from API Response */}
              <div className="space-y-4 divide-y">
                {dryRunData.map((empOutput) => {
                  const grossEarnings = empOutput.earnings.basicPay + 
                                        empOutput.earnings.allowances + 
                                        empOutput.earnings.overtimePay + 
                                        empOutput.earnings.bonuses.reduce((sum, b) => sum + b.amount, 0);

                  const statutoryDeductions = Object.entries(empOutput.deductions)
                    .filter(([key]) => key !== "unpaidLeavesAmount" && key !== "advanceRecovery")
                    .reduce((sum, [_, val]) => sum + val, 0);

                  return (
                    <div key={empOutput.employeeId} className="space-y-2 py-2 first:pt-0">
                      <div className="flex justify-between font-bold">
                        <span className="text-zinc-900 text-sm">{empOutput.name}</span>
                        <span className="text-zinc-900 text-sm">₹{empOutput.netPayable.toLocaleString("en-IN")}</span>
                      </div>
                      
                      <div className="text-xs text-zinc-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Gross Earnings</span>
                          <span>₹{grossEarnings.toLocaleString("en-IN")}</span>
                        </div>
                        
                        {empOutput.deductions.unpaidLeavesAmount > 0 && (
                          <div className="flex justify-between text-amber-600">
                            <span>LWP (Unpaid Leaves & Absences)</span>
                            <span>-₹{empOutput.deductions.unpaidLeavesAmount.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        
                        {statutoryDeductions > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>Statutory Deductions (PF/ESIC/PT)</span>
                            <span>-₹{statutoryDeductions.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        
                        {empOutput.deductions.advanceRecovery > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>Advance Recovery</span>
                            <span>-₹{empOutput.deductions.advanceRecovery.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Engine Aggregation */}
              <div className="bg-zinc-50 border rounded-xl p-4 space-y-2 mt-6">
                <div className="flex justify-between text-xs text-zinc-500 font-semibold">
                  <span>Total Gross Payout</span>
                  <span>
                    ₹{dryRunData.reduce((sum, e) => {
                      const gross = e.earnings.basicPay + 
                                    e.earnings.allowances + 
                                    e.earnings.overtimePay + 
                                    e.earnings.bonuses.reduce((s, b) => s + b.amount, 0);
                      return sum + gross;
                    }, 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-rose-600 font-semibold">
                  <span>Total Recoveries & Deductions</span>
                  <span>
                    -₹{dryRunData.reduce((sum, e) => {
                      const stat = Object.entries(e.deductions)
                        .filter(([key]) => key !== "unpaidLeavesAmount" && key !== "advanceRecovery")
                        .reduce((s, [_, val]) => s + val, 0);
                      return sum + e.deductions.advanceRecovery + stat + e.deductions.unpaidLeavesAmount;
                    }, 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-dashed pt-2 text-zinc-950">
                  <span>Total Cash Required</span>
                  <span>
                    ₹{dryRunData.reduce((sum, e) => sum + e.netPayable, 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t mt-6">
              <button onClick={() => setDryRunOpen(false)} className="flex-1 py-2.5 border rounded-lg text-sm font-semibold hover:bg-zinc-50">
                Cancel
              </button>
              <button onClick={handleLockPayroll} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm">
                Confirm & Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
