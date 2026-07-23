// components/dashboard/employee/apply-leave-form.js
"use client";

import { useState, useEffect } from "react";

export default function ApplyLeaveForm() {
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    leaveType: "Sick Leave",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState({ sick: 5, casual: 6, unpaid: 0 });
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchLeaveData = async () => {
    try {
      const res = await fetch("/api/v1/leaves");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBalances(data.balances);
          setLeaveHistory(data.leaves || []);
        }
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "Failed to fetch leave details.");
      }
    } catch (err) {
      console.error("Error fetching leaves:", err);
      setErrorMsg("Network error. Could not retrieve leave information.");
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/v1/leaves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(data.message || "Leave request submitted successfully!");
        setFormData({ startDate: "", endDate: "", leaveType: "Sick Leave", reason: "" });
        await fetchLeaveData(); // Refresh history and balances
      } else {
        setErrorMsg(data.error || "Failed to submit leave request.");
      }
    } catch (err) {
      console.error("Error submitting leave request:", err);
      setErrorMsg("Network error. Could not submit leave request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Leave Balances Header Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 border border-zinc-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Sick</span>
          <p className="text-lg font-black text-emerald-600 mt-1">{balances.sick} / {balances.maxSick ?? 5}</p>
          <span className="text-[9px] text-zinc-400">Available</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-zinc-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Casual</span>
          <p className="text-lg font-black text-sky-600 mt-1">{balances.casual} / {balances.maxCasual ?? 6}</p>
          <span className="text-[9px] text-zinc-400">Available</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-zinc-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Unpaid</span>
          <p className="text-lg font-black text-rose-600 mt-1">
            {balances.unpaid} {balances.unpaid === 1 ? "Day" : "Days"}
          </p>
          <span className="text-[9px] text-zinc-400">Taken</span>
        </div>
      </div>

      {/* Apply Leave Card */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider border-b pb-2">Apply for Leave</h3>
        
        {errorMsg && (
          <div className="text-xs p-3 rounded-lg border font-medium text-center bg-rose-50 text-rose-700 border-rose-100">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="text-xs p-3 rounded-lg border font-medium text-center bg-emerald-50 text-emerald-700 border-emerald-100">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase">Start Date</label>
              <input
                type="date"
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase">End Date</label>
              <input
                type="date"
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase">Leave Type</label>
            <select
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2.5 bg-white text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
            >
              <option value="Sick Leave">Sick Leave (Paid)</option>
              <option value="Casual Leave">Casual Leave (Paid)</option>
              <option value="Unpaid Leave">Unpaid Leave (LWP)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase">Reason for Leave</label>
            <textarea
              required
              rows={3}
              placeholder="Please describe the reason..."
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-950 focus:outline-none text-sm"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white rounded-md py-2.5 text-sm font-semibold hover:bg-zinc-800 transition-colors"
          >
            {loading ? "Submitting..." : "Submit Leave Request"}
          </button>
        </form>
      </div>

      {/* Leave History Card */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider border-b pb-2">Leave History</h3>
        <div className="divide-y divide-zinc-100">
          {leaveHistory.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">No leave requests found.</p>
          ) : (
            leaveHistory.map((leave) => (
              <div key={leave.id} className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-zinc-900">{leave.type}</span>
                  <span className="text-xs text-zinc-400">
                    {leave.dates} ({leave.days} {leave.days > 1 ? "days" : "day"})
                  </span>
                  {leave.reason && (
                    <span className="text-[11px] text-zinc-500 italic mt-0.5">
                      Reason: "{leave.reason}"
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                      leave.status === "Approved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : leave.status === "Rejected"
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}
                  >
                    {leave.status}
                  </span>
                  <span className="text-[9px] text-zinc-400">
                    {leave.isPaid ? "Paid Leave" : "Loss of Pay"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
