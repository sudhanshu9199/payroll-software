// components/dashboard/admin/onboarding/kyc-step.js
"use client";

export default function KYCStep({ data, update }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-md font-bold text-zinc-900 border-b pb-2">1. Personal & KYC Details</h3>
        <p className="text-xs text-zinc-500 mt-1">Verify identity inputs to avoid payment routing issues.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase">Full Legal Name</label>
          <input
            type="text"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
            placeholder="Must match bank account exactly"
            value={data.fullName}
            onChange={(e) => update({ fullName: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase">Phone (WhatsApp Preferred)</label>
          <input
            type="tel"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
            placeholder="+91..."
            value={data.phone}
            onChange={(e) => update({ phone: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase">Role / Designation</label>
          <select
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2.5 bg-white text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
            value={data.designation}
            onChange={(e) => update({ designation: e.target.value })}
          >
            <option value="Head Cook">Head Cook</option>
            <option value="Cook">Cook</option>
            <option value="Waiter">Waiter</option>
            <option value="Cashier">Cashier</option>
            <option value="Cleaner">Cleaner</option>
            <option value="Manager">Manager</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase">Aadhaar Number</label>
          <input
            type="text"
            required
            maxLength={12}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
            placeholder="12-digit UID"
            value={data.aadhaar}
            onChange={(e) => update({ aadhaar: e.target.value.replace(/\D/g, "") })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase">PAN Card Number</label>
          <input
            type="text"
            required
            maxLength={10}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm uppercase"
            placeholder="10-digit alphanumeric"
            value={data.pan}
            onChange={(e) => update({ pan: e.target.value.toUpperCase() })}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase">KYC Document Upload</label>
        <div className="mt-2 border-2 border-dashed border-zinc-300 hover:border-zinc-400 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer bg-zinc-50/50">
          <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-zinc-500 font-medium mt-2">Upload Aadhar / PAN photos (PDF, PNG, JPG)</span>
        </div>
      </div>
    </div>
  );
}
