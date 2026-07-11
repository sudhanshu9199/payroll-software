// components/auth/login-form.js
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [formData, setformData] = useState({ identifier: "", password: "" });
  const [loading, setloading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setloading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: formData.identifier,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Successful login; route based on role
      if (data.user.role === "Admin") {
        router.push("/dashboard/admin");
      } else {
        router.push("/dashboard/employees");
      }
      
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setloading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && (
        <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      <div className="space-y-4 rounded-md shadow-sm">
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Email or Phone Number
          </label>
          <input
            type="text"
            required
            value={formData.identifier}
            onChange={(e) =>
              setformData({ ...formData, identifier: e.target.value })
            }
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-950 focus:outline-none sm:text-sm"
            placeholder="your@example.com or +91..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Password
          </label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) =>
              setformData({ ...formData, password: e.target.value })
            }
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-950 focus:outline-none sm:text-sm"
            placeholder="••••••••"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative flex w-full justify-center rounded-md bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>

      <div className="text-center text-sm">
        <span className="text-zinc-600">New to TaskFlow? </span>
        <Link
          href="/signup"
          className="font-semibold text-zinc-900 hover:underline"
        >
          Register your business
        </Link>
      </div>
    </form>
  );
}
