// components/dashboard/employee/payslip-list.js
"use client";

import { useState } from "react";

export default function PayslipList() {
  const [downloadingId, setDownloadingId] = useState(null);
  
  const currentMonthPayslip = {
    month: "June 2026",
    netPay: 18500,
    grossEarnings: 21500,
    totalDeductions: 3000,
    workingDays: "28 / 30",
    earnings: [
      { name: "Basic Pay", amount: 12000 },
      { name: "House Rent Allowance (HRA)", amount: 6000 },
      { name: "Overtime (8 hrs)", amount: 3500 },
    ],
    deductions: [
      { name: "Unpaid Leaves (2 days)", amount: 1000 },
      { name: "Advance Recovery", amount: 2000 },
    ],
  };

  const pastPayslips = [
    { id: "may-2026", month: "May 2026", netPay: 20500, daysWorked: "30 / 31" },
    { id: "apr-2026", month: "April 2026", netPay: 19000, daysWorked: "29 / 30" },
    { id: "mar-2026", month: "March 2026", netPay: 20500, daysWorked: "31 / 31" },
  ];

  const handleDownload = (id) => {
    setDownloadingId(id);
    // Simulating Puppeteer PDF generation request
    setTimeout(() => {
      setDownloadingId(null);
      alert("Payslip PDF generated & downloaded successfully.");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Latest Payslip Highlight Card */}
      <div className="bg-zinc-950 text-white rounded-2xl p-6 border border-zinc-800 shadow-md">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-xs uppercase font-bold text-zinc-400">Net Take-Home Pay</span>
            <span className="text-3xl font-black mt-1">₹{currentMonthPayslip.netPay.toLocaleString("en-IN")}</span>
          </div>
          <span className="bg-zinc-800 text-zinc-200 text-xs font-semibold px-3 py-1 rounded-full">
            {currentMonthPayslip.month}
          </span>
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 text-sm">
          <div>
            <span className="text-zinc-400 block text-xs">Days Present</span>
            <span className="font-bold text-zinc-100">{currentMonthPayslip.workingDays} Days</span>
          </div>
          <div className="text-right">
            <span className="text-zinc-400 block text-xs">Payment Status</span>
            <span className="font-bold text-emerald-400">Processed (UPI)</span>
          </div>
        </div>
      </div>

      {/* Itemized Salary Breakdown Card */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-5">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider border-b pb-2">Payslip Breakup</h3>
        
        <div className="space-y-4">
          {/* Earnings */}
          <div>
            <h4 className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider mb-2">Earnings (+)</h4>
            <div className="space-y-2">
              {currentMonthPayslip.earnings.map((e, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-zinc-600">{e.name}</span>
                  <span className="font-bold text-zinc-900">₹{e.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm border-t border-dashed pt-2 font-bold text-zinc-900">
                <span>Total Earnings</span>
                <span>₹{currentMonthPayslip.grossEarnings.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h4 className="text-xs font-extrabold text-rose-600 uppercase tracking-wider mb-2">Deductions (-)</h4>
            <div className="space-y-2">
              {currentMonthPayslip.deductions.map((d, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-zinc-600">{d.name}</span>
                  <span className="font-bold text-zinc-900">₹{d.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm border-t border-dashed pt-2 font-bold text-rose-700">
                <span>Total Deductions</span>
                <span>₹{currentMonthPayslip.totalDeductions.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Archive Card */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider border-b pb-2">Payslip Archive</h3>
        <div className="divide-y divide-zinc-100">
          {pastPayslips.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-900">{p.month}</span>
                <span className="text-xs text-zinc-400">Net Pay: ₹{p.netPay.toLocaleString("en-IN")} | Att: {p.daysWorked}</span>
              </div>
              <button
                onClick={() => handleDownload(p.id)}
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
    </div>
  );
}
