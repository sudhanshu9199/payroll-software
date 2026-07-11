// components/auth/signup-form.js
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupForm() {
  const router = useRouter();
  const [formData, setformData] = useState({
    businessName: "",
    email: "",
    phone: "",
    password: "",
    workingDays: 30,
    payrollCycle: "Monthly",
    timeZone: "Asia/Kolkata",
  });
  const [loading, setloading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setloading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Business Owner", // Default owner name placeholder
          email: formData.email,
          password: formData.password,
          role: "Admin",
          businessName: formData.businessName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Successful registration; redirect directly to Admin Dashboard
      router.push("/dashboard/admin");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setloading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-sm border border-zinc-200"
    >
      {error && (
        <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-md font-semibold text-zinc-900 border-b pb-1">
            1. Business Profile
          </h3>
          <div className="mt-3">
            <label className="block text-sm font-medium text-zinc-700">
              Business / Company Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Rasoi Royal"
              value={formData.businessName}
              onChange={(e) =>
                setformData({ ...formData, businessName: e.target.value })
              }
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none sm:text-sm"
            />
          </div>
        </div>

        <div className="pt-2">
          <h3 className="text-md font-semibold text-zinc-900 border-b pb-1">
            2. Owner Credentials
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Email Address
              </label>
              <input
                type="email"
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none sm:text-sm"
                placeholder="owner@example.com"
                value={formData.email}
                onChange={(e) =>
                  setformData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Phone Number
              </label>
              <input
                type="tel"
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none sm:text-sm"
                placeholder="+91..."
                value={formData.phone}
                onChange={(e) =>
                  setformData({ ...formData, phone: e.target.value })
                }
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-zinc-700">
              Password
            </label>
            <input
              type="password"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none sm:text-sm"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setformData({ ...formData, password: e.target.value })
              }
            />
          </div>
        </div>

        {/* Step 3: Default Configuration */}
        <div className="pt-2">
          <h3 className="text-md font-semibold text-zinc-900 border-b pb-1">
            3. System Configurations
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Working Days / Mo
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none sm:text-sm"
                value={formData.workingDays}
                onChange={(e) =>
                  setformData({
                    ...formData,
                    workingDays: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Payroll Cycle
              </label>
              <select
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2.5 bg-white text-zinc-900 focus:border-zinc-950 focus:outline-none sm:text-sm"
                value={formData.payrollCycle}
                onChange={(e) =>
                  setformData({ ...formData, payrollCycle: e.target.value })
                }
              >
                <option value="Monthly">Monthly</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Time Zone
              </label>
              <select
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2.5 bg-white text-zinc-900 focus:border-zinc-950 focus:outline-none sm:text-sm"
                value={formData.timeZone}
                onChange={(e) =>
                  setformData({ ...formData, timeZone: e.target.value })
                }
              >
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full justify-center rounded-md bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Registering Organization..." : "Register Organization"}
        </button>
      </div>
      <div className="text-center text-sm">
        <span className="text-zinc-600">Already registered? </span>
        <Link
          href="/login"
          className="font-semibold text-zinc-900 hover:underline"
        >
          Sign In
        </Link>
      </div>
    </form>
  );
}
