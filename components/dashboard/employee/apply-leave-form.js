// components/dashboard/employee/apply-leave-form.js
"use client";

import { useState } from "react";

export default function ApplyLeaveForm() {
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    leaveType: "Sick Leave",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState([
    { id: 1, type: "Sick Leave", dates: "14 Jun - 15 Jun", days: 2, status: "Approved", isPaid: true },
    { id: 2, type: "Unpaid Leave", dates: "10 Jun - 10 Jun", days: 1, status: "Approved", isPaid: false },
    { id: 3, type: "Casual Leave", dates: "02 Jul - 03 Jul", days: 2, status: "Pending", isPaid: true },
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    // Mock leave request submission
    setTimeout(() => {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const newLeave = {
        id: Date.now(),
        type: formData.leaveType,
        dates: `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        days: diffDays,
        status: "Pending",
        isPaid: formData.leaveType !== "Unpaid Leave",
      };

      setLeaveHistory([newLeave, ...leaveHistory]);
      setFormData({ startDate: "", endDate: "", leaveType: "Sick Leave", reason: "" });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Leave Balances Header Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 border border-zinc-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Sick</span>
          <p className="text-lg font-black text-emerald-600 mt-1">2 / 5</p>
          <span className="text-[9px] text-zinc-400">Available</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-zinc-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Casual</span>
          <p className="text-lg font-black text-sky-600 mt-1">4 / 6</p>
          <span className="text-[9px] text-zinc-400">Available</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-zinc-200 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Unpaid</span>
          <p className="text-lg font-black text-rose-600 mt-1">1 Day</p>
          <span className="text-[9px] text-zinc-400">Taken</span>
        </div>
      </div>

      {/* Apply Leave Card */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider border-b pb-2">Apply for Leave</h3>
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
          {leaveHistory.map((leave) => (
            <div key={leave.id} className="flex items-center justify-between py-3">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-900">{leave.type}</span>
                <span className="text-xs text-zinc-400">{leave.dates} ({leave.days} {leave.days > 1 ? "days" : "day"})</span>
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
          ))}
        </div>
      </div>
    </div>
  );
}
