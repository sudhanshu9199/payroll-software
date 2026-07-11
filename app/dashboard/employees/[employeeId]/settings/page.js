// app/dashboard/employees/[employeeId]/settings/page.js
"use client";

import { useState } from "react";

export default function EmployeeSettingsPage({ params }) {
  const [passwords, setPasswords] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Mock employee profile data (synced with onboarding fields)
  const profile = {
    name: "Amit Kumar",
    phone: "+91 98765 43210",
    designation: "Head Cook",
    aadhaar: "XXXX-XXXX-8943",
    pan: "ABCDEXXXXF",
    shift: "Day Shift (9:00 AM - 6:00 PM)",
    overtime: "Eligible (Standard hourly rate)",
    payoutRoute: "Bank Transfer (SBI)",
    bankAccount: "•••• •••• ••23",
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      setLoading(false);
      return;
    }

    setTimeout(() => {
      setMessage({ type: "success", text: "Password updated successfully." });
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Profile & Settings</h1>
        <p className="text-xs text-zinc-500">Review your profile details or secure your account credentials.</p>
      </div>

      {/* KYC & Identity Section */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider border-b pb-2">Employment Info</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-zinc-400 block text-xs">Full Legal Name</span>
            <span className="font-bold text-zinc-900">{profile.name}</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-xs">Role / Title</span>
            <span className="font-bold text-zinc-900">{profile.designation}</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-xs">Phone Number</span>
            <span className="font-bold text-zinc-900">{profile.phone}</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-xs">Shift Timing</span>
            <span className="font-bold text-zinc-900">{profile.shift}</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-xs">Aadhaar Card</span>
            <span className="font-bold text-zinc-900">{profile.aadhaar}</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-xs">PAN Card</span>
            <span className="font-bold text-zinc-900">{profile.pan}</span>
          </div>
        </div>
      </div>

      {/* Bank details preview */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider border-b pb-2">Payment Details</h3>
        <div className="flex items-center justify-between text-sm">
          <div className="flex flex-col">
            <span className="font-bold text-zinc-900">{profile.payoutRoute}</span>
            <span className="text-xs text-zinc-400">Account: {profile.bankAccount}</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            Active
          </span>
        </div>
        <p className="text-[10px] text-zinc-400 leading-normal">
          *Bank details can only be edited by the Business Admin. To update your bank account, please request corrections from Xavier.
        </p>
      </div>

      {/* Password Reset Form */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider border-b pb-2">Update Password</h3>
        
        {message && (
          <div
            className={`text-xs p-3 rounded-lg border font-medium text-center ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-rose-50 text-rose-700 border-rose-100"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase">Old Password</label>
            <input
              type="password"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-950 focus:outline-none text-sm"
              value={passwords.oldPassword}
              onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase">New Password</label>
            <input
              type="password"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-950 focus:outline-none text-sm"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase">Confirm New Password</label>
            <input
              type="password"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-950 focus:outline-none text-sm"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white rounded-md py-2.5 text-sm font-semibold hover:bg-zinc-800 transition-colors pt-2"
          >
            {loading ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
