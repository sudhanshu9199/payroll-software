// components/dashboard/admin/onboarding/payout-step.js
"use client";

import { useState } from "react";

export default function PayoutStep({ data, update }) {
  const [bankInfo, setBankInfo] = useState(null);
  const [checkingIfsc, setCheckingIfsc] = useState(false);

  const handleIfscBlur = (e) => {
    const ifsc = e.target.value.toUpperCase();
    update({ ifsc });
    
    if (ifsc.length >= 11) {
      setCheckingIfsc(true);
      // Mock IFSC lookup
      setTimeout(() => {
        setCheckingIfsc(false);
        if (ifsc.startsWith("SBIN")) {
          setBankInfo("State Bank of India - Hajipur Main Branch (Verified)");
        } else if (ifsc.startsWith("HDFC")) {
          setBankInfo("HDFC Bank - Patna Rajendra Nagar Branch (Verified)");
        } else {
          setBankInfo("Bank verified for code: " + ifsc);
        }
      }, 1000);
    } else {
      setBankInfo(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-md font-bold text-zinc-900 border-b pb-2">3. Payout Method & Routing</h3>
        <p className="text-xs text-zinc-500 mt-1">Configure how the employee receives their monthly salary.</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase">Preferred Payout Mode</label>
        <div className="grid grid-cols-3 gap-3 mt-2">
          {["Bank Transfer", "UPI", "Cash"].map((mode) => (
            <label
              key={mode}
              className={`flex flex-col items-center gap-2 border rounded-lg p-3 hover:bg-zinc-50 cursor-pointer text-center font-bold text-xs ${
                data.paymentMethod === mode ? "border-zinc-950 bg-zinc-50 text-zinc-950" : "text-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                className="sr-only"
                checked={data.paymentMethod === mode}
                onChange={() => update({ paymentMethod: mode })}
              />
              {mode === "Bank Transfer" && (
                <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              )}
              {mode === "UPI" && (
                <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              {mode === "Cash" && (
                <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              )}
              <span>{mode}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Conditionally Render Payment Details */}
      {data.paymentMethod === "Bank Transfer" && (
        <div className="space-y-4 border border-zinc-200 rounded-xl p-4 bg-zinc-50/50">
          <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">Bank Details</span>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase">Account Holder Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
                placeholder="Name as in Passbook"
                value={data.accountHolder}
                onChange={(e) => update({ accountHolder: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase">IFSC Code</label>
              <input
                type="text"
                required
                maxLength={11}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm uppercase"
                placeholder="e.g. SBIN0001234"
                value={data.ifsc}
                onChange={(e) => update({ ifsc: e.target.value.toUpperCase() })}
                onBlur={handleIfscBlur}
              />
              {checkingIfsc && <span className="text-[10px] text-zinc-500 animate-pulse mt-1 block">Validating IFSC code...</span>}
              {bankInfo && <span className="text-[10px] text-emerald-600 font-bold mt-1 block">{bankInfo}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase">Bank Account Number</label>
              <input
                type="password"
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
                placeholder="•••• •••• ••••"
                value={data.accountNum}
                onChange={(e) => update({ accountNum: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase">Confirm Account Number</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
                placeholder="Re-enter account number"
                value={data.confirmAccount}
                onChange={(e) => update({ confirmAccount: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {data.paymentMethod === "UPI" && (
        <div className="space-y-4 border border-zinc-200 rounded-xl p-4 bg-zinc-50/50">
          <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">UPI Routing</span>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase">UPI VPA ID</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
              placeholder="e.g. 9876543210@ybl or username@okaxis"
              value={data.upiId}
              onChange={(e) => update({ upiId: e.target.value })}
            />
            <span className="text-[10px] text-zinc-400 block mt-1">Payment will be routed directly to this digital wallet.</span>
          </div>
        </div>
      )}

      {data.paymentMethod === "Cash" && (
        <div className="border border-zinc-200 rounded-xl p-5 bg-zinc-50/50 text-center text-sm font-medium text-zinc-500">
          💵 Cash payment method selected. No bank routing details required. Payslips will be generated, and can be marked as "Paid in Cash" during monthly processing.
        </div>
      )}
    </div>
  );
}
