// components/dashboard/admin/leave-approval-card.js
"use client";

export default function LeaveApprovalCard({ leave, onApprove, onReject }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:border-zinc-300 transition-all space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <span className="text-sm font-bold text-zinc-950 block">{leave.name}</span>
          <span className="text-xs text-zinc-500 font-semibold">{leave.role}</span>
        </div>
        <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
          {leave.type}
        </span>
      </div>

      <div className="flex justify-between items-center text-xs text-zinc-600 bg-zinc-50 rounded-lg p-2.5">
        <div>
          <span className="text-zinc-400 block text-[9px] uppercase font-bold">Request Period</span>
          <span className="font-bold text-zinc-800">{leave.dates}</span>
        </div>
        <div className="text-right">
          <span className="text-zinc-400 block text-[9px] uppercase font-bold">Duration</span>
          <span className="font-bold text-zinc-800">{leave.days} {leave.days > 1 ? "Days" : "Day"}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onApprove(leave.id)}
          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
        >
          Approve (Paid)
        </button>
        <button
          onClick={() => onReject(leave.id)}
          className="flex-1 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-lg transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
