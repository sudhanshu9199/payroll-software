// components/dashboard/employee/punch-button.js
"use client";

import { useState, useEffect, useCallback } from "react";

export default function PunchButton() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [punchState, setPunchState] = useState("OUT"); // "OUT" or "IN"
  const [punchInTime, setPunchInTime] = useState(null);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setDate(
        now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "short",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch today's initial status and logs from database on load
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/attendance/status");
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setPunchState(data.status);
          setPunchInTime(data.punchInTime || null);
        }
        if (data.logs) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.error("Failed to load initial punch status:", err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handlePunch = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({
          lat: latitude.toFixed(6),
          lng: longitude.toFixed(6),
          accuracy: accuracy.toFixed(1),
        });

        try {
          const res = await fetch("/api/v1/attendance/punch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message || data.error || "Punch request failed");
          }

          // Successful Punch
          const now = new Date();
          const formattedTime = now.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });

          const serverType = data.punch.type; // "In" or "Out"
          setPunchState(serverType === "In" ? "IN" : "OUT");

          if (serverType === "In") {
            setPunchInTime(formattedTime);
          } else {
            setPunchInTime(null);
          }

          // Prepend new log
          setLogs((prev) => [
            {
              type: serverType === "In" ? "IN" : "OUT",
              time: formattedTime,
              date: "Today",
              status: `Verified (${data.punch.distanceMeters}m)`,
            },
            ...prev,
          ]);

        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError("Could not verify your location. Please check your GPS permissions.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6">
      {/* Clock Display */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm text-center">
        <h2 className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">{date}</h2>
        <h1 className="text-4xl font-extrabold text-zinc-900 mt-2 tracking-tight">{time}</h1>
        <p className="text-xs text-zinc-400 mt-1">Shift Timing: 9:00 AM - 6:00 PM</p>
      </div>

      {/* Stateful Punch Button Area */}
      <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm space-y-4">
        <button
          onClick={handlePunch}
          disabled={loading}
          className={`relative flex h-48 w-48 flex-col items-center justify-center rounded-full border-8 transition-all active:scale-95 shadow-md disabled:opacity-80 cursor-pointer ${
            punchState === "IN"
              ? "bg-amber-50 border-amber-400 hover:bg-amber-100"
              : "bg-emerald-50 border-emerald-400 hover:bg-emerald-100"
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-950" />
              <span className="text-xs font-semibold text-zinc-600">Verifying GPS...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-1">
              <svg
                className={`h-12 w-12 ${punchState === "IN" ? "text-amber-600" : "text-emerald-600"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              <span className={`text-xl font-black ${punchState === "IN" ? "text-amber-800" : "text-emerald-800"}`}>
                {punchState === "IN" ? "PUNCH OUT" : "PUNCH IN"}
              </span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                Tap to Log
              </span>
            </div>
          )}
        </button>

        {/* Location / Status Warnings */}
        {location && !error && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            GPS Secured: {location.lat}, {location.lng} (±{location.accuracy}m)
          </div>
        )}

        {error && (
          <div className="text-xs text-rose-600 bg-rose-50 px-4 py-2.5 rounded-lg border border-rose-100 font-semibold text-center max-w-xs">
            ⚠️ {error}
          </div>
        )}

        {punchState === "IN" && punchInTime && (
          <p className="text-sm font-semibold text-zinc-700">
            Punched In today at <span className="text-zinc-950 font-bold">{punchInTime}</span>
          </p>
        )}
      </div>

      {/* Daily Logs Table */}
      {logs.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider border-b pb-2">Recent Attendance Log</h3>
          <div className="divide-y divide-zinc-100">
            {logs.map((log, index) => (
              <div key={index} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      log.type === "IN" || log.type === "In"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {log.type}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-900">{log.time}</span>
                    <span className="text-xs text-zinc-400">{log.date}</span>
                  </div>
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
