"use client";

import { useState, useEffect } from "react";
import EmployeeExitModal from "./EmployeeExitModal";

export default function EmployeeProfileModal({ employeeId, onClose, onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("attendance"); // 'attendance' | 'documents' | 'compensation' | 'personal'
  const [exitModalOpen, setExitModalOpen] = useState(false);
  
  // Edit mode state
  const [isEditingDocs, setIsEditingDocs] = useState(false);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable Form states
  const [docForm, setDocForm] = useState({
    resumeUrl: "",
    appointmentLetterUrl: "",
    idProofUrl: "",
  });

  const [personalForm, setPersonalForm] = useState({
    email: "",
    phoneNumber: "",
    department: "",
    aadhaar: "",
    pan: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    upiId: "",
    emergencyName: "",
    emergencyRelation: "",
    emergencyPhone: "",
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/employees/${employeeId}`);
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to load employee profile");
      }

      setData(result);
      // Initialize edit forms
      const emp = result.employee;
      setDocForm({
        resumeUrl: emp.documents?.resumeUrl || "",
        appointmentLetterUrl: emp.documents?.appointmentLetterUrl || "",
        idProofUrl: emp.documents?.idProofUrl || "",
      });

      setPersonalForm({
        email: emp.email || "",
        phoneNumber: emp.phoneNumber || "",
        department: emp.department || "General",
        aadhaar: emp.aadhaar || "",
        pan: emp.pan || "",
        accountNumber: emp.bankDetails?.accountNumber || "",
        ifscCode: emp.bankDetails?.ifscCode || "",
        bankName: emp.bankDetails?.bankName || "",
        upiId: emp.bankDetails?.upiId || "",
        emergencyName: emp.emergencyContact?.name || "",
        emergencyRelation: emp.emergencyContact?.relationship || "",
        emergencyPhone: emp.emergencyContact?.phone || "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchProfile();
    }
  }, [employeeId]);

  const handleReinstate = async () => {
    if (!confirm("Are you sure you want to re-instate this employee back to Active roster?")) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/v1/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reinstate" }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to reinstate employee.");
      await fetchProfile();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDocs = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: docForm,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update documents.");
      setIsEditingDocs(false);
      await fetchProfile();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: personalForm.email,
          phoneNumber: personalForm.phoneNumber,
          department: personalForm.department,
          aadhaar: personalForm.aadhaar,
          pan: personalForm.pan,
          bankDetails: {
            accountNumber: personalForm.accountNumber,
            ifscCode: personalForm.ifscCode,
            bankName: personalForm.bankName,
            upiId: personalForm.upiId,
          },
          emergencyContact: {
            name: personalForm.emergencyName,
            relationship: personalForm.emergencyRelation,
            phone: personalForm.emergencyPhone,
          },
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update profile details.");
      setIsEditingPersonal(false);
      await fetchProfile();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!employeeId) return null;

  const emp = data?.employee;
  const stats = data?.stats;

  // Initials generator
  const getInitials = (name) => {
    if (!name) return "EMP";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Loading State */}
        {loading && (
          <div className="p-16 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium text-sm">Aggregating Employee 360° Records...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center text-2xl font-bold">
              ⚠️
            </div>
            <h3 className="text-xl font-bold text-white">Failed to Load Profile</h3>
            <p className="text-slate-400 text-sm max-w-md">{error}</p>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Loaded Profile View */}
        {!loading && emp && (
          <>
            {/* HERO HEADER - Glassmorphic Dark Card */}
            <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 p-6 sm:p-8 border-b border-slate-800/80">
              {/* Top Action Row */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-full uppercase tracking-wider">
                    {emp.department || "General"}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                      emp.status === "Active"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        emp.status === "Active" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                      }`}
                    ></span>
                    {emp.status}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  {/* RESUME QUICK DOWNLOAD BUTTON (Psychology Target) */}
                  {emp.documents?.resumeUrl ? (
                    <a
                      href={emp.documents.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      View / Download Resume
                    </a>
                  ) : (
                    <button
                      onClick={() => setActiveTab("documents")}
                      className="inline-flex items-center px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 text-xs sm:text-sm rounded-xl transition-all"
                    >
                      <svg
                        className="w-4 h-4 mr-2 text-amber-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      No Resume Attached (Add)
                    </button>
                  )}

                  {/* OFFBOARD / REINSTATE ACTION BUTTON */}
                  {emp.status === "Active" ? (
                    <button
                      onClick={() => setExitModalOpen(true)}
                      className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center space-x-1.5"
                    >
                      <span>🚪 Offboard Staff</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleReinstate}
                      disabled={saving}
                      className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-300 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center space-x-1.5"
                    >
                      <span>🔄 Re-instate Staff</span>
                    </button>
                  )}

                  {/* Close Modal Button */}
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors"
                    title="Close (Esc)"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Main Profile Info Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-extrabold shadow-xl shadow-indigo-950/50 border-2 border-indigo-400/30">
                  {getInitials(emp.name)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      {emp.name}
                    </h2>
                  </div>
                  <p className="text-slate-400 text-sm font-medium flex items-center space-x-2">
                    <span className="text-indigo-400 font-semibold">{emp.role}</span>
                    <span>•</span>
                    <span>
                      Joined:{" "}
                      {emp.dates?.joiningDate
                        ? new Date(emp.dates.joiningDate).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </p>

                  <div className="pt-2 flex flex-wrap gap-3 text-xs text-slate-300">
                    <span className="flex items-center bg-slate-800/60 px-3 py-1 rounded-lg border border-slate-700/50">
                      📞 {emp.phoneNumber}
                    </span>
                    {emp.email && (
                      <span className="flex items-center bg-slate-800/60 px-3 py-1 rounded-lg border border-slate-700/50">
                        ✉️ {emp.email}
                      </span>
                    )}
                    <span className="flex items-center bg-slate-800/60 px-3 py-1 rounded-lg border border-slate-700/50">
                      ⏰ Shift: {emp.shift?.startTime || "09:00"} - {emp.shift?.endTime || "18:00"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PSYCHOLOGY KPI METRICS BAR */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-900/90 border-b border-slate-800">
              {/* Metric 1: Present Days (Emerald) */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Present This Month</span>
                  <span className="text-emerald-400 font-bold">🟢 Active</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white">
                    {stats?.presentDays || 0}{" "}
                    <span className="text-xs text-slate-400 font-normal">
                      / {stats?.workingDaysInMonth || 30} Days
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    {stats?.attendancePercentage || 0}%
                  </span>
                </div>
              </div>

              {/* Metric 2: Late Arrivals (Amber) */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Late Arrivals</span>
                  <span className="text-amber-400 font-bold">🟡 Punctuality</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white">
                    {stats?.lateArrivals || 0}{" "}
                    <span className="text-xs text-slate-400 font-normal">Times</span>
                  </span>
                  <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                    {stats?.lateArrivals > 2 ? "High Late Rate" : "Normal"}
                  </span>
                </div>
              </div>

              {/* Metric 3: Worked Hours (Blue) */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Logged Hours</span>
                  <span className="text-blue-400 font-bold">⏱️ Hours</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-white">
                    {stats?.totalHoursWorked || 0}{" "}
                    <span className="text-xs text-slate-400 font-normal">Hrs</span>
                  </span>
                </div>
              </div>

              {/* Metric 4: Active Loan/Advance (Indigo) */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Active Advance Balance</span>
                  <span className="text-indigo-400 font-bold">💳 Loans</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-white">
                    ₹{(data?.activeAdvanceTotal || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* TABBED NAVIGATION BAR */}
            <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab("attendance")}
                className={`py-3.5 px-5 font-semibold text-sm border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
                  activeTab === "attendance"
                    ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>📊 Attendance Matrix & Logs</span>
              </button>

              <button
                onClick={() => setActiveTab("documents")}
                className={`py-3.5 px-5 font-semibold text-sm border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
                  activeTab === "documents"
                    ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>📄 Resume & Document Vault</span>
                {emp.documents?.resumeUrl && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("compensation")}
                className={`py-3.5 px-5 font-semibold text-sm border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
                  activeTab === "compensation"
                    ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>💰 Payroll & Compensation</span>
              </button>

              <button
                onClick={() => setActiveTab("personal")}
                className={`py-3.5 px-5 font-semibold text-sm border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
                  activeTab === "personal"
                    ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>👤 Personal & Bank Details</span>
              </button>
            </div>

            {/* TAB CONTENT CONTAINER */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* TAB 1: ATTENDANCE & LEAVES */}
              {activeTab === "attendance" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Monthly Attendance & Punch Logs</h3>
                      <p className="text-xs text-slate-400">
                        Detailed log of employee check-ins, check-outs, and late mark occurrences.
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                      Total Logs: {data?.attendanceLogs?.length || 0}
                    </span>
                  </div>

                  {/* Attendance Log Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">In Punch</th>
                          <th className="px-4 py-3">Out Punch</th>
                          <th className="px-4 py-3">Duration</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {data?.attendanceLogs && data.attendanceLogs.length > 0 ? (
                          data.attendanceLogs.map((log) => {
                            const inPunch = log.punches?.find((p) => p.type === "In");
                            const outPunch = log.punches?.find((p) => p.type === "Out");
                            return (
                              <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3 font-medium text-white">
                                  {new Date(log.date).toLocaleDateString("en-IN", {
                                    weekday: "short",
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </td>
                                <td className="px-4 py-3 text-emerald-400 font-mono">
                                  {inPunch
                                    ? new Date(inPunch.timestamp).toLocaleTimeString("en-IN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "--:--"}
                                </td>
                                <td className="px-4 py-3 text-blue-400 font-mono">
                                  {outPunch
                                    ? new Date(outPunch.timestamp).toLocaleTimeString("en-IN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "--:--"}
                                </td>
                                <td className="px-4 py-3 font-semibold text-white">
                                  {log.calculatedHours ? `${log.calculatedHours} hrs` : "0 hrs"}
                                </td>
                                <td className="px-4 py-3">
                                  {log.isLate ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                                      LATE
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                                      ON TIME
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                              No attendance records logged for this month yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Leave Application History */}
                  <div className="space-y-3 pt-4">
                    <h4 className="text-sm font-bold text-white">Leave Requests & Allocations</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {data?.leaves && data.leaves.length > 0 ? (
                        data.leaves.map((leave) => (
                          <div
                            key={leave._id}
                            className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-bold text-white">{leave.type} Leave</p>
                              <p className="text-[11px] text-slate-400">
                                {new Date(leave.startDate).toLocaleDateString("en-IN")} -{" "}
                                {new Date(leave.endDate).toLocaleDateString("en-IN")}
                              </p>
                              {leave.reason && (
                                <p className="text-[11px] text-slate-500 italic mt-0.5">
                                  "{leave.reason}"
                                </p>
                              )}
                            </div>
                            <span
                              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md uppercase ${
                                leave.status === "Approved"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : leave.status === "Rejected"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {leave.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 p-4 text-center text-slate-500 text-xs bg-slate-800/20 rounded-xl border border-slate-800/60">
                          No leave applications on record.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: RESUME & DOCUMENT VAULT */}
              {activeTab === "documents" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Employee Document Vault</h3>
                      <p className="text-xs text-slate-400">
                        Appointment resume, offer letter, and compliance government IDs.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsEditingDocs(!isEditingDocs)}
                      className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-all flex items-center space-x-1.5"
                    >
                      <span>{isEditingDocs ? "Cancel Editing" : "✏️ Edit / Attach Links"}</span>
                    </button>
                  </div>

                  {/* Document Edit Form */}
                  {isEditingDocs ? (
                    <form
                      onSubmit={handleSaveDocs}
                      className="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl space-y-4"
                    >
                      <h4 className="text-sm font-bold text-indigo-400">Update Document URLs</h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-slate-300 font-medium mb-1">
                            Resume URL (PDF / Google Drive / Cloud Link):
                          </label>
                          <input
                            type="url"
                            value={docForm.resumeUrl}
                            onChange={(e) => setDocForm({ ...docForm, resumeUrl: e.target.value })}
                            placeholder="https://example.com/resume.pdf"
                            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-medium mb-1">
                            Appointment Letter URL:
                          </label>
                          <input
                            type="url"
                            value={docForm.appointmentLetterUrl}
                            onChange={(e) =>
                              setDocForm({ ...docForm, appointmentLetterUrl: e.target.value })
                            }
                            placeholder="https://example.com/appointment-letter.pdf"
                            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-medium mb-1">
                            ID Proof URL (Aadhaar / PAN Copy):
                          </label>
                          <input
                            type="url"
                            value={docForm.idProofUrl}
                            onChange={(e) => setDocForm({ ...docForm, idProofUrl: e.target.value })}
                            placeholder="https://example.com/id-proof.pdf"
                            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingDocs(false)}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40"
                        >
                          {saving ? "Saving..." : "Save Document Links"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Display Document Vault Cards */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* CARD 1: RESUME */}
                      <div className="bg-slate-800/40 border border-slate-700/70 hover:border-indigo-500/50 transition-all rounded-2xl p-5 flex flex-col justify-between space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-xl font-bold">
                              📄
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">Employee Resume</h4>
                              <p className="text-xs text-slate-400">Appointment CV Document</p>
                            </div>
                          </div>
                          {emp.documents?.resumeUrl ? (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                              VERIFIED
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                              MISSING
                            </span>
                          )}
                        </div>

                        {emp.documents?.resumeUrl ? (
                          <div className="pt-2 flex items-center justify-between border-t border-slate-700/50">
                            <span className="text-xs text-slate-400 truncate max-w-[200px]">
                              {emp.documents.resumeUrl}
                            </span>
                            <a
                              href={emp.documents.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                            >
                              <span>View PDF ↗</span>
                            </a>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-slate-700/50 text-center">
                            <p className="text-xs text-slate-500 italic">No resume attached during appointment.</p>
                          </div>
                        )}
                      </div>

                      {/* CARD 2: APPOINTMENT LETTER */}
                      <div className="bg-slate-800/40 border border-slate-700/70 hover:border-indigo-500/50 transition-all rounded-2xl p-5 flex flex-col justify-between space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl font-bold">
                              📜
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">Appointment Letter</h4>
                              <p className="text-xs text-slate-400">Signed Employment Contract</p>
                            </div>
                          </div>
                          {emp.documents?.appointmentLetterUrl ? (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                              ATTACHED
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-700 text-slate-400 rounded-md">
                              NOT UPLOADED
                            </span>
                          )}
                        </div>

                        {emp.documents?.appointmentLetterUrl ? (
                          <div className="pt-2 flex items-center justify-between border-t border-slate-700/50">
                            <span className="text-xs text-slate-400 truncate max-w-[200px]">
                              {emp.documents.appointmentLetterUrl}
                            </span>
                            <a
                              href={emp.documents.appointmentLetterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                            >
                              <span>View Letter ↗</span>
                            </a>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-slate-700/50 text-center">
                            <p className="text-xs text-slate-500 italic">No appointment letter uploaded.</p>
                          </div>
                        )}
                      </div>

                      {/* CARD 3: GOVERNMENT ID PROOF */}
                      <div className="bg-slate-800/40 border border-slate-700/70 hover:border-indigo-500/50 transition-all rounded-2xl p-5 flex flex-col justify-between space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xl font-bold">
                              🪪
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">Government Identity Proof</h4>
                              <p className="text-xs text-slate-400">Aadhaar & PAN Numbers</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-700/50">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Aadhaar Number:</span>
                            <span className="font-mono font-bold text-white">
                              {emp.aadhaar || "Not Provided"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">PAN Number:</span>
                            <span className="font-mono font-bold text-white">
                              {emp.pan || "Not Provided"}
                            </span>
                          </div>
                          {emp.documents?.idProofUrl && (
                            <div className="pt-2 flex justify-end">
                              <a
                                href={emp.documents.idProofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold"
                              >
                                View ID Attachment ↗
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PAYROLL & COMPENSATION */}
              {activeTab === "compensation" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Active Salary Structure & Advances</h3>
                      <p className="text-xs text-slate-400">
                        Monthly base salary structure and ongoing loan recovery records.
                      </p>
                    </div>
                  </div>

                  {/* Active Salary Card */}
                  <div className="bg-gradient-to-r from-slate-800 to-indigo-950/40 border border-slate-700 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-indigo-400 font-semibold uppercase">Active Compensation Structure</span>
                        <h4 className="text-2xl font-black text-white mt-1">
                          ₹{(data?.currentSalary?.baseAmount || 0).toLocaleString("en-IN")}{" "}
                          <span className="text-xs font-normal text-slate-400">/ Month Base</span>
                        </h4>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">
                        ACTIVE STRUCTURE
                      </span>
                    </div>

                    {/* Breakdown components if advanced mode */}
                    {data?.currentSalary?.isAdvancedMode && data?.currentSalary?.components?.length > 0 && (
                      <div className="pt-4 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {data.currentSalary.components.map((comp, idx) => (
                          <div key={idx} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                            <span className="text-[11px] text-slate-400 font-medium block">{comp.name}</span>
                            <span className={`text-sm font-bold ${comp.type === 'Earning' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {comp.type === 'Earning' ? '+' : '-'} ₹{comp.amount?.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Advance / Loans Summary Table */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white">Active Salary Advance & Loan Records</h4>
                    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="px-4 py-3">Total Sanctioned</th>
                            <th className="px-4 py-3">Remaining Balance</th>
                            <th className="px-4 py-3">Deduction / Month</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {data?.advances && data.advances.length > 0 ? (
                            data.advances.map((adv) => (
                              <tr key={adv._id} className="hover:bg-slate-800/30">
                                <td className="px-4 py-3 font-semibold text-white">
                                  ₹{adv.totalAmount?.toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3 font-bold text-amber-400">
                                  ₹{adv.balanceRemaining?.toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3 text-slate-300">
                                  ₹{adv.deductionPerMonth?.toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                                      adv.status === "Active"
                                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    }`}
                                  >
                                    {adv.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="px-4 py-6 text-center text-slate-500">
                                No active salary advances or loans found for this employee.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PERSONAL & BANK DETAILS */}
              {activeTab === "personal" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Personal & Bank Information</h3>
                      <p className="text-xs text-slate-400">
                        Official contact details, bank accounts for salary credit, and emergency contacts.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsEditingPersonal(!isEditingPersonal)}
                      className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-all flex items-center space-x-1.5"
                    >
                      <span>{isEditingPersonal ? "Cancel" : "✏️ Edit Details"}</span>
                    </button>
                  </div>

                  {isEditingPersonal ? (
                    /* Edit Form */
                    <form
                      onSubmit={handleSavePersonal}
                      className="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl space-y-4"
                    >
                      <h4 className="text-sm font-bold text-indigo-400">Edit Personal & Bank Profile</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Email Address:</label>
                          <input
                            type="email"
                            value={personalForm.email}
                            onChange={(e) => setPersonalForm({ ...personalForm, email: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Phone Number:</label>
                          <input
                            type="text"
                            value={personalForm.phoneNumber}
                            onChange={(e) => setPersonalForm({ ...personalForm, phoneNumber: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Department:</label>
                          <input
                            type="text"
                            value={personalForm.department}
                            onChange={(e) => setPersonalForm({ ...personalForm, department: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Bank Name:</label>
                          <input
                            type="text"
                            value={personalForm.bankName}
                            onChange={(e) => setPersonalForm({ ...personalForm, bankName: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Account Number:</label>
                          <input
                            type="text"
                            value={personalForm.accountNumber}
                            onChange={(e) => setPersonalForm({ ...personalForm, accountNumber: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-medium mb-1">IFSC Code:</label>
                          <input
                            type="text"
                            value={personalForm.ifscCode}
                            onChange={(e) => setPersonalForm({ ...personalForm, ifscCode: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Emergency Contact Name:</label>
                          <input
                            type="text"
                            value={personalForm.emergencyName}
                            onChange={(e) => setPersonalForm({ ...personalForm, emergencyName: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Emergency Contact Phone:</label>
                          <input
                            type="text"
                            value={personalForm.emergencyPhone}
                            onChange={(e) => setPersonalForm({ ...personalForm, emergencyPhone: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingPersonal(false)}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40"
                        >
                          {saving ? "Saving..." : "Save Profile"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Display Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* BANK DETAILS */}
                      <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-2xl space-y-3">
                        <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                          <span>🏦 Bank Account for Salary Disbursal</span>
                        </h4>
                        <div className="space-y-2 text-xs text-slate-300 pt-1">
                          <div className="flex justify-between border-b border-slate-700/40 pb-1.5">
                            <span className="text-slate-400">Bank Name:</span>
                            <span className="font-semibold text-white">{emp.bankDetails?.bankName || "Not set"}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-700/40 pb-1.5">
                            <span className="text-slate-400">Account Number:</span>
                            <span className="font-mono font-semibold text-white">{emp.bankDetails?.accountNumber || "Not set"}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-700/40 pb-1.5">
                            <span className="text-slate-400">IFSC Code:</span>
                            <span className="font-mono font-semibold text-indigo-400">{emp.bankDetails?.ifscCode || "Not set"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">UPI ID:</span>
                            <span className="font-mono text-emerald-400">{emp.bankDetails?.upiId || "Not set"}</span>
                          </div>
                        </div>
                      </div>

                      {/* EMERGENCY CONTACT */}
                      <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-2xl space-y-3">
                        <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                          <span>🚨 Emergency Contact</span>
                        </h4>
                        <div className="space-y-2 text-xs text-slate-300 pt-1">
                          <div className="flex justify-between border-b border-slate-700/40 pb-1.5">
                            <span className="text-slate-400">Contact Person:</span>
                            <span className="font-semibold text-white">{emp.emergencyContact?.name || "Not set"}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-700/40 pb-1.5">
                            <span className="text-slate-400">Relationship:</span>
                            <span className="font-semibold text-slate-300">{emp.emergencyContact?.relationship || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Phone Number:</span>
                            <span className="font-mono font-bold text-emerald-400">{emp.emergencyContact?.phone || "Not set"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Employee ID: <code className="font-mono text-slate-300">{emp._id}</code></span>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </>
        )}
      </div>

      {/* Employee Exit & FnF Audit Modal */}
      {exitModalOpen && (
        <EmployeeExitModal
          employeeId={employeeId}
          onClose={() => setExitModalOpen(false)}
          onSuccess={() => {
            fetchProfile();
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
