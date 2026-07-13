// components/dashboard/admin/onboarding/salary-step.js
"use client";

import { useState, useEffect } from "react";

export default function SalaryStep({ data, update }) {
  const [components, setComponents] = useState(
    data.components && data.components.length > 0
      ? data.components
      : [
          { name: "Basic Pay", amount: 9000, type: "EARNING" },
          { name: "House Rent Allowance (HRA)", amount: 4500, type: "EARNING" },
          { name: "Conveyance Allowance", amount: 4500, type: "EARNING" },
        ]
  );

  useEffect(() => {
    update({ components });
  }, [components]);

  const handleAddComponent = () => {
    setComponents([...components, { name: "", amount: "", type: "EARNING" }]);
  };

  const handleComponentChange = (index, field, value) => {
    const updated = [...components];
    updated[index][field] = value;
    setComponents(updated);
  };

  const handleRemoveComponent = (index) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-md font-bold text-zinc-900 border-b pb-2">2. Salary Structure & Compliance</h3>
        <p className="text-xs text-zinc-500 mt-1">Configure compensation rates, overtime, and mandatory deductions.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase">Joining Date</label>
          <input
            type="date"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
            value={data.joiningDate}
            onChange={(e) => update({ joiningDate: e.target.value })}
          />
        </div>
      </div>

      {/* Progressive Disclosure Toggle */}
      <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-zinc-900 block">Enable Advanced Salary Structure</span>
            <span className="text-xs text-zinc-500">Break down salary into allowances and deductions.</span>
          </div>
          <button
            type="button"
            onClick={() => update({ isAdvancedMode: !data.isAdvancedMode })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              data.isAdvancedMode ? "bg-zinc-900" : "bg-zinc-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                data.isAdvancedMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Dynamic Forms Render */}
        {!data.isAdvancedMode ? (
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase">Net Monthly Salary (Gross)</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 text-sm">₹</span>
              <input
                type="number"
                className="pl-7 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
                placeholder="e.g. 18000"
                value={data.baseSalary}
                onChange={(e) => update({ baseSalary: e.target.value })}
              />
            </div>
            <span className="text-[10px] text-zinc-400 block mt-1">Internally stored as 100% Basic Pay.</span>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">Salary Components</span>
            <div className="space-y-2">
              {components.map((comp, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-900 focus:outline-none text-xs"
                    placeholder="Component Name (e.g. HRA)"
                    value={comp.name}
                    onChange={(e) => handleComponentChange(index, "name", e.target.value)}
                  />
                  <div className="relative w-28">
                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-zinc-400 text-xs">₹</span>
                    <input
                      type="number"
                      className="pl-5 block w-full rounded-md border border-zinc-300 px-2 py-1.5 text-zinc-900 focus:outline-none text-xs"
                      placeholder="Amount"
                      value={comp.amount}
                      onChange={(e) => handleComponentChange(index, "amount", parseInt(e.target.value))}
                    />
                  </div>
                  <select
                    className="w-24 rounded-md border border-zinc-300 px-2 py-1.5 bg-white text-zinc-900 focus:outline-none text-xs"
                    value={comp.type}
                    onChange={(e) => handleComponentChange(index, "type", e.target.value)}
                  >
                    <option value="EARNING">Earning</option>
                    <option value="DEDUCTION">Deduction</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveComponent(index)}
                    className="text-rose-500 hover:text-rose-700 p-1"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddComponent}
              className="text-xs font-bold text-zinc-700 hover:text-zinc-950 flex items-center gap-1 mt-2 hover:underline"
            >
              + Add Custom Allowance / Component
            </button>
          </div>
        )}
      </div>

      {/* Statutory Deductions */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Statutory Deductions (EPF & ESIC)</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 border rounded-lg p-3 hover:bg-zinc-50 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
              checked={data.epfEnabled}
              onChange={(e) => update({ epfEnabled: e.target.checked })}
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-900">Deduct EPF</span>
              <span className="text-[10px] text-zinc-400">12% of Basic Pay</span>
            </div>
          </label>
          <label className="flex items-center gap-2 border rounded-lg p-3 hover:bg-zinc-50 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
              checked={data.esicEnabled}
              onChange={(e) => update({ esicEnabled: e.target.checked })}
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-900">Deduct ESIC</span>
              <span className="text-[10px] text-zinc-400">0.75% of Gross Pay</span>
            </div>
          </label>
          <label className="flex items-center gap-2 border rounded-lg p-3 hover:bg-zinc-50 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
              checked={data.ptEnabled}
              onChange={(e) => update({ ptEnabled: e.target.checked })}
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-900">Deduct PT</span>
              <span className="text-[10px] text-zinc-400">Standard Professional Tax</span>
            </div>
          </label>
        </div>
      </div>

      {/* Overtime Eligibility */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Overtime Settings</span>
        <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-900">Eligible for Overtime (OT)</span>
              <span className="text-[10px] text-zinc-400">Record overtime hours during daily punch calculations.</span>
            </div>
            <input
              type="checkbox"
              className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 h-5 w-5"
              checked={data.otEnabled}
              onChange={(e) => update({ otEnabled: e.target.checked })}
            />
          </div>

          {data.otEnabled && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-zinc-500 uppercase">OT Calculation Policy</label>
              <select
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2.5 bg-white text-zinc-900 focus:border-zinc-950 focus:outline-none text-xs"
                value={data.otType}
                onChange={(e) => update({ otType: e.target.value })}
              >
                <option value="Standard Hourly">Standard Hourly Rate</option>
                <option value="Double Hourly">Double Hourly Rate (Sunday/Holiday)</option>
                <option value="Fixed Bonus">Fixed Bonus per hour (e.g. ₹100/hr)</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
