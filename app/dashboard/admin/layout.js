// app/dashboard/admin/layout.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState({ name: "Admin", email: "" });
  const [business, setBusiness] = useState({ name: "TaskFlow Company" });
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    // Fetch profile
    fetch("/api/v1/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.user) setUser(data.user);
          if (data.business) setBusiness(data.business);
        }
      })
      .catch((err) => console.error("Failed to load profile:", err));

    // Dynamic current date
    const today = new Date();
    const formatted = today.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    setCurrentDate(formatted);
  }, []);

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard/admin",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: "Employees",
      href: "/dashboard/admin/employees",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: "Add Employee",
      href: "/dashboard/admin/employees/new",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-zinc-200 bg-white">
        <div className="flex h-16 items-center px-6 border-b border-zinc-100">
          <span className="text-lg font-black tracking-tight text-zinc-950">
            TaskFlow<span className="text-emerald-600 font-bold">.</span>
          </span>
        </div>
        <div className="flex flex-col flex-1 gap-y-7 px-4 py-6 overflow-y-auto">
          <nav className="flex flex-col gap-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex flex-col flex-1 md:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-8 shadow-sm">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-zinc-500 hover:text-zinc-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Context Details */}
          <div className="flex items-center gap-2">
            <span className="text-md font-bold text-zinc-900">
              {business.name}
            </span>
            <span className="hidden sm:inline bg-zinc-100 border text-zinc-600 text-xs px-2.5 py-0.5 rounded-full font-medium">
              {currentDate}
            </span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-zinc-900 hidden sm:inline">{user.name}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 font-semibold text-white border text-sm shadow-sm uppercase">
              {user.name ? user.name.charAt(0) : "A"}
            </div>
          </div>
        </header>

        {/* Mobile Sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div className="fixed inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative flex flex-col w-64 bg-white border-r">
              <div className="flex h-16 items-center px-6 border-b">
                <span className="text-lg font-black text-zinc-950">TaskFlow.</span>
              </div>
              <nav className="flex flex-col gap-y-1 p-4">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-semibold ${
                        isActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Child Router Output */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
