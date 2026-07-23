// app/dashboard/employees/layout.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function EmployeeLayout({ children }) {
  const pathname = usePathname();
  
  const [user, setUser] = useState({ name: "Employee", employeeId: "employee1" });
  const [business, setBusiness] = useState({ name: "TaskFlow Company" });

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.user) {
            setUser(data.user);
            const realId = data.user.employeeId;
            if (realId && data.user.role === "Employee") {
              const segments = window.location.pathname.split("/");
              if (segments[2] === "employees" && segments[3] && segments[3] !== realId && segments[3] !== "attendance") {
                segments[3] = realId;
                const newPath = segments.join("/");
                window.location.href = newPath;
              }
            }
          }
          if (data.business) setBusiness(data.business);
        }
      })
      .catch((err) => console.error("Failed to load employee profile:", err));
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/v1/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/";
      } else {
        console.error("Logout failed");
      }
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  const employeeId = user.employeeId || "employee1";

  const navItems = [
    {
      name: "Attendance",
      href: "/dashboard/employees/attendance",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Leaves",
      href: `/dashboard/employees/${employeeId}/leave`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: "Payslips",
      href: `/dashboard/employees/${employeeId}/payslip`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: "Settings",
      href: `/dashboard/employees/${employeeId}/settings`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white px-4 shadow-sm">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Employee Portal</span>
          <span className="text-md font-bold text-zinc-900">{business.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 font-semibold text-zinc-800 border border-zinc-200 text-sm uppercase">
            {user.name ? user.name.substring(0, 2) : "EM"}
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:text-red-600 hover:bg-zinc-50 transition-colors border border-zinc-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto p-4">{children}</main>

      {/* Bottom PWA Style Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-25 border-t border-zinc-200 bg-white shadow-lg">
        <div className="mx-auto flex h-16 max-w-md justify-around">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full gap-1 text-xs font-medium transition-colors ${
                  isActive ? "text-zinc-950 font-semibold" : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
