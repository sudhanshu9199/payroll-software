// components/dashboard/admin/onboarding/onboarding-wizard.js
"use client";

import { useState } from "react";
import KYCStep from "./kyc-step";
import SalaryStep from "./salary-step";
import PayoutStep from "./payout-step";
import ShiftStep from "./shift-step";

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successCredentials, setSuccessCredentials] = useState(null);

  const [formData, setFormData] = useState({
    // Step 1: KYC & Personal
    fullName: "",
    phone: "",
    designation: "Waiter",
    aadhaar: "",
    pan: "",
    // Step 2: Salary & Compliance
    joiningDate: "",
    isAdvancedMode: false,
    baseSalary: "",
    epfEnabled: false,
    esicEnabled: false,
    ptEnabled: false,
    otEnabled: false,
    otType: "Standard Hourly",
    components: [],
    sickLeaves: 5,
    casualLeaves: 6,
    // Step 3: Payouts & Banking
    paymentMethod: "Bank Transfer",
    accountHolder: "",
    accountNum: "",
    confirmAccount: "",
    ifsc: "",
    upiId: "",
    // Step 4: Shift & Geofencing
    shiftName: "General Shift (9 AM - 6 PM)",
    gracePeriod: 15,
    locationName: "Hajipur Main Branch",
    radiusMeters: 50,
  });

  const updateForm = (fields) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/v1/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to onboard employee");
      }

      setSuccessCredentials({
        name: formData.fullName,
        phone: formData.phone,
        password: data.tempPassword,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Step Progress Headers */}
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                currentStep >= step
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-400 border border-zinc-200"
              }`}
            >
              {step}
            </span>
            <span
              className={`text-xs font-bold hidden sm:inline ${
                currentStep === step ? "text-zinc-900" : "text-zinc-400"
              }`}
            >
              {step === 1 && "Identity & KYC"}
              {step === 2 && "Salary Setup"}
              {step === 3 && "Payout Routing"}
              {step === 4 && "Shift & GPS"}
            </span>
          </div>
        ))}
      </div>

      {/* Steps Rendering */}
      <div className="min-h-[300px]">
        {error && (
          <div className="mb-5 p-3.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2">
            <span>⚠️ {error}</span>
          </div>
        )}
        {currentStep === 1 && <KYCStep data={formData} update={updateForm} />}
        {currentStep === 2 && <SalaryStep data={formData} update={updateForm} />}
        {currentStep === 3 && <PayoutStep data={formData} update={updateForm} />}
        {currentStep === 4 && <ShiftStep data={formData} update={updateForm} />}
      </div>

      {/* Navigation Actions */}
      <div className="flex justify-between border-t pt-4">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1 || submitting}
          className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={nextStep}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-semibold hover:bg-zinc-800"
          >
            Next Step
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Processing..." : "Finish Onboarding"}
          </button>
        )}
      </div>

      {/* Success Modal */}
      {successCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-zinc-100 text-center space-y-6">
            <div className="flex justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-zinc-950 tracking-tight">Onboarding Successful!</h3>
              <p className="text-sm text-zinc-500">
                Employee <strong>{successCredentials.name}</strong> has been successfully registered. The login credentials are ready below:
              </p>
            </div>

            <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100 text-left space-y-3 font-mono text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-xs text-zinc-400 font-sans font-semibold uppercase">Login Identifier</span>
                <span className="text-zinc-950 font-bold">{successCredentials.phone}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-xs text-zinc-400 font-sans font-semibold uppercase">Temporary Password</span>
                <span className="text-zinc-950 font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                  {successCredentials.password}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400">
              *The employee can sign in using their phone number and this password. They will be directed to their punch-in dashboard immediately.
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/dashboard/admin/employees";
              }}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              Continue to Employee List
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
