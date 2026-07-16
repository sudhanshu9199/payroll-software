// components/dashboard/employee/payslip-list.js
"use client";

import { useState, useEffect } from "react";

export default function PayslipList({ employeeId }) {
  const [downloadingId, setDownloadingId] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPayslips() {
      try {
        const url = employeeId 
          ? `/api/v1/payroll/employee?employeeId=${employeeId}`
          : "/api/v1/payroll/employee";
        
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to retrieve payslips.");
        const data = await res.json();
        
        if (data.success) {
          setPayslips(data.payslips || []);
        } else {
          throw new Error(data.error || "Failed to load payslips.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPayslips();
  }, [employeeId]);

  const handleDownload = (p) => {
    if (!p.payslipUrl) {
      alert("This payslip PDF is currently being generated in the background. Please refresh in a moment!");
      return;
    }
    
    setDownloadingId(p.id);
    
    // Provide a small micro-interaction delay for the downloading spinner feedback
    setTimeout(() => {
      setDownloadingId(null);
      const link = document.createElement("a");
      link.href = p.payslipUrl;
      link.target = "_blank";
      link.download = `Payslip_${p.month.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 600);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
        <p className="text-sm text-zinc-500 font-medium">Fetching payroll records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
        <p className="text-sm text-rose-800 font-bold">Error loading payslips</p>
        <p className="text-xs text-rose-600 mt-1">{error}</p>
      </div>
    );
  }

  if (payslips.length === 0) {
    return (
      <div className="bg-zinc-50 border border-zinc-200 border-dashed rounded-2xl p-8 text-center">
        <svg className="mx-auto h-10 w-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-3 text-sm font-bold text-zinc-950">No finalized payslips</h3>
        <p className="mt-1 text-xs text-zinc-500">Your monthly payroll summaries will appear here once finalized by the administrator.</p>
      </div>
    );
  }

  const currentMonthPayslip = payslips[0];
  const pastPayslips = payslips.slice(1);

  return (
    <div className="space-y-6">
      {/* Latest Payslip Highlight Card */}
      <div className="bg-zinc-950 text-white rounded-2xl p-6 border border-zinc-800 shadow-md">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-xs uppercase font-bold text-zinc-400">Net Take-Home Pay</span>
            <span className="text-3xl font-black mt-1">₹{currentMonthPayslip.netPay.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="bg-zinc-800 text-zinc-200 text-xs font-semibold px-3 py-1 rounded-full">
              {currentMonthPayslip.month}
            </span>
            {currentMonthPayslip.payslipUrl && (
              <button
                onClick={() => handleDownload(currentMonthPayslip)}
                disabled={downloadingId !== null}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {downloadingId === currentMonthPayslip.id ? "Downloading..." : "Download PDF"}
              </button>
            )}
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 text-sm">
          <div>
            <span className="text-zinc-400 block text-xs">Days Present / Period</span>
            <span className="font-bold text-zinc-100">{currentMonthPayslip.daysWorked} Days</span>
          </div>
          <div className="text-right">
            <span className="text-zinc-400 block text-xs">Payment Status</span>
            <span className={`font-bold ${currentMonthPayslip.status === "Paid" ? "text-emerald-400" : "text-amber-400"}`}>
              {currentMonthPayslip.status === "Paid" ? "Paid" : "Processed / Pending"}
            </span>
          </div>
        </div>
      </div>

      {/* Itemized Salary Breakdown Card */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-5">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider border-b pb-2">Payslip Breakup</h3>
        
        <div className="space-y-4">
          {/* Earnings */}
          {currentMonthPayslip.earnings && currentMonthPayslip.earnings.length > 0 && (
            <div>
              <h4 className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider mb-2">Earnings (+)</h4>
              <div className="space-y-2">
                {currentMonthPayslip.earnings.map((e, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-zinc-600">{e.name}</span>
                    <span className="font-bold text-zinc-900">₹{e.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm border-t border-dashed pt-2 font-bold text-zinc-900">
                  <span>Gross Earnings</span>
                  <span>₹{currentMonthPayslip.grossEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

          {/* Deductions */}
          {currentMonthPayslip.deductions && currentMonthPayslip.deductions.length > 0 && (
            <div>
              <h4 className="text-xs font-extrabold text-rose-600 uppercase tracking-wider mb-2">Deductions (-)</h4>
              <div className="space-y-2">
                {currentMonthPayslip.deductions.map((d, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-zinc-600">{d.name}</span>
                    <span className="font-bold text-zinc-900">₹{d.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm border-t border-dashed pt-2 font-bold text-rose-700">
                  <span>Total Deductions</span>
                  <span>₹{currentMonthPayslip.totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Archive Card */}
      {pastPayslips.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider border-b pb-2">Payslip Archive</h3>
          <div className="divide-y divide-zinc-100">
            {pastPayslips.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-zinc-900">{p.month}</span>
                  <span className="text-xs text-zinc-400">
                    Net Pay: ₹{p.netPay.toLocaleString("en-IN", { minimumFractionDigits: 2 })} | Att: {p.daysWorked}
                  </span>
                </div>
                <button
                  onClick={() => handleDownload(p)}
                  disabled={downloadingId !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-300 rounded-lg text-xs font-bold text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 transition-all"
                >
                  {downloadingId === p.id ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900" />
                      <span>PDF...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
