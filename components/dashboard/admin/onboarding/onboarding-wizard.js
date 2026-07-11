// components/dashboard/admin/onboarding/onboarding-wizard.js
"use client";

import { useState } from "react";
import KYCStep from "./kyc-step";
import SalaryStep from "./salary-step";
import PayoutStep from "./payout-step";
import ShiftStep from "./shift-step";

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
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
  });

  const updateForm = (fields) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Onboarding Form Submitted Payload:", formData);
    alert(`Employee "${formData.fullName}" onboarded successfully! Account created for phone "${formData.phone}".`);
    window.location.href = "/dashboard/admin/employees";
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
          disabled={currentStep === 1}
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
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
          >
            Finish Onboarding
          </button>
        )}
      </div>
    </div>
  );
}
