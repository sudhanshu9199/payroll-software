"use client";

import { useState, useEffect } from "react";

export default function EmployeeExitModal({ employeeId, onClose, onSuccess }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [exitDate, setExitDate] = useState(new Date().toISOString().split("T")[0]);
  const [exitReason, setExitReason] = useState("Resignation");
  const [exitNotes, setExitNotes] = useState("");

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/employees/${employeeId}`);
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to load employee details.");
      }
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchAuditData();
    }
  }, [employeeId]);

  const handleConfirmExit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "offboard",
          exitDate,
          exitReason,
          exitNotes,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to offboard employee.");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!employeeId) return null;

  const emp = data?.employee;
  const fnf = data?.fnfAudit;

  // Calculate Tenure
  const calculateTenure = (joiningDate) => {
    if (!joiningDate) return "N/A";
    const start = new Date(joiningDate);
    const end = new Date();
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (diffMonths < 1) return "< 1 Month";
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    if (years === 0) return `${months} Month${months > 1 ? "s" : ""}`;
    return `${years} Yr${years > 1 ? "s" : ""} ${months} Mo${months > 1 ? "s" : ""}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-xl">
              🚪
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Employee Offboarding & FnF Audit</h3>
              <p className="text-xs text-slate-400">Process staff exit and compute prorated final settlement payout.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400">Auditing employee records and unrecovered loans...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-rose-400 font-semibold text-sm">{error}</p>
            <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white text-xs rounded-xl">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleConfirmExit} className="p-6 space-y-5">
            
            {/* Employee Profile Identity Banner */}
            <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-2xl flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white font-black flex items-center justify-center text-base border border-rose-400/30">
                {emp?.name ? emp.name.substring(0, 2).toUpperCase() : "EM"}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-base">{emp?.name}</h4>
                <p className="text-xs text-slate-400">
                  {emp?.role} • Joined: {emp?.dates?.joiningDate ? new Date(emp.dates.joiningDate).toLocaleDateString("en-IN") : "N/A"}
                </p>
                <span className="inline-block mt-1 text-[11px] font-semibold text-slate-300 bg-slate-700/60 px-2 py-0.5 rounded-md">
                  Tenure: {calculateTenure(emp?.dates?.joiningDate)}
                </span>
              </div>
            </div>

            {/* Permanent Record Preservation Safeguard Alert */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-3.5 rounded-2xl flex items-start space-x-3 text-xs text-indigo-300">
              <span className="text-base">🛡️</span>
              <div>
                <strong className="block text-indigo-200 font-bold mb-0.5">Permanent Record Retention Policy</strong>
                <span>All attendance logs, salary slips, bank accounts, and documents for this employee will be <strong>permanently preserved</strong> for historical audit and FnF settlement.</span>
              </div>
            </div>

            {/* FnF Prorated Settlement Audit Box */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                Estimated Full & Final (FnF) Settlement Payout
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Worked Days in Exit Month:</span>
                  <span className="text-base font-black text-emerald-400">
                    {fnf?.workedDaysInPeriod || 0} Days Present
                  </span>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Prorated Worked Salary:</span>
                  <span className="text-base font-black text-white">
                    ₹{(fnf?.proratedGrossPay || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Outstanding Loan Deductions:</span>
                  <span className={`text-base font-black ${fnf?.outstandingAdvances > 0 ? "text-amber-400" : "text-slate-400"}`}>
                    - ₹{(fnf?.outstandingAdvances || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 p-3 rounded-xl border border-emerald-500/30">
                  <span className="text-emerald-400 font-bold block text-[11px]">Estimated Net FnF Payout:</span>
                  <span className="text-base font-black text-emerald-300">
                    ₹{(fnf?.estimatedNetFnF || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Exit Details Form Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Effective Exit Date:</label>
                <input
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason for Leaving:</label>
                <select
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Resignation">Resignation (Employee Left)</option>
                  <option value="Termination">Termination (Company Relieved)</option>
                  <option value="Contract End">End of Employment Contract</option>
                  <option value="Personal">Personal Grounds</option>
                  <option value="Other">Other Reasons</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Administrative Exit Notes:</label>
                <textarea
                  rows="2"
                  value={exitNotes}
                  onChange={(e) => setExitNotes(e.target.value)}
                  placeholder="Optional handover details or offboarding remarks..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-rose-500 placeholder-slate-600"
                ></textarea>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-950/40 transition-all flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Offboarding Staff...</span>
                  </>
                ) : (
                  <span>Confirm Relieve & Queue FnF Payment 🚪</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
