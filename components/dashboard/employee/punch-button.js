// components/dashboard/employee/punch-button.js
"use client";

import { useState, useEffect, useCallback, memo } from "react";

// ==========================================
// 1. CACHED FORMATTERS (Performance Boost)
// ==========================================
// Instantiating Intl formatters once prevents recreating them every 1000ms
const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "short",
});

const shortTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

// ==========================================
// 2. ISOLATED LIVE CLOCK COMPONENT
// ==========================================
// Memoized so it handles its own 1-sec re-renders without affecting the parent
const LiveClock = memo(() => {
  const [timeState, setTimeState] = useState({ time: "", date: "" });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeState({
        time: timeFormatter.format(now),
        date: dateFormatter.format(now),
      });
    };

    updateTime(); // Initial call
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm text-center">
      <h2 className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">
        {timeState.date || "Loading date..."}
      </h2>
      <h1
        className="text-4xl font-extrabold text-zinc-900 mt-2 tracking-tight tabular-nums"
        aria-live="polite"
      >
        {timeState.time || "--:--:--"}
      </h1>
      <p className="text-xs text-zinc-400 mt-1">
        Shift Timing: 9:00 AM - 6:00 PM
      </p>
    </div>
  );
});
LiveClock.displayName = "LiveClock";

// ==========================================
// 3. BUSINESS LOGIC HOOK
// ==========================================
function useAttendance() {
  const [punchState, setPunchState] = useState("OUT"); // "OUT" or "IN"
  const [punchInTime, setPunchInTime] = useState(null);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  // Fetch initial status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/attendance/status");
      if (!res.ok) throw new Error("Failed to fetch status");

      const data = await res.json();
      if (data.status) {
        setPunchState(data.status);
        setPunchInTime(data.punchInTime || null);
      }
      if (data.logs) setLogs(data.logs);
    } catch (err) {
      console.error("Attendance initialization error:", err);
      // Fallback strategies can be implemented here
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handlePunch = useCallback(() => {
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
        const currentLoc = {
          lat: latitude.toFixed(6),
          lng: longitude.toFixed(6),
          accuracy: accuracy.toFixed(1),
        };
        setLocation(currentLoc);

        try {
          const res = await fetch("/api/v1/attendance/punch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude }),
          });

          const data = await res.json();
          if (!res.ok)
            throw new Error(
              data.message || data.error || "Punch request failed",
            );

          const formattedTime = shortTimeFormatter.format(new Date());
          const serverType = data.punch.type; // "In" or "Out"

          setPunchState(serverType === "In" ? "IN" : "OUT");
          setPunchInTime(serverType === "In" ? formattedTime : null);

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
        // Standardized geolocation error messages
        const geoErrors = {
          1: "Location access denied. Please enable GPS permissions.",
          2: "Position unavailable. Network or satellite issues.",
          3: "Location request timed out. Try again.",
        };
        setError(geoErrors[err.code] || "Could not verify your location.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }, // maximumAge: 0 forces fresh GPS poll
    );
  }, []);

  return {
    punchState,
    punchInTime,
    location,
    error,
    loading,
    logs,
    handlePunch,
  };
}

// ==========================================
// 4. MAIN UI COMPONENT
// ==========================================
export default function PunchButton() {
  const {
    punchState,
    punchInTime,
    location,
    error,
    loading,
    logs,
    handlePunch,
  } = useAttendance();

  const isPunchedIn = punchState === "IN";

  return (
    <div className="space-y-6">
      <LiveClock />

      {/* Stateful Punch Button Area */}
      <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm space-y-4">
        <button
          onClick={handlePunch}
          disabled={loading}
          aria-busy={loading}
          aria-label={isPunchedIn ? "Punch Out" : "Punch In"}
          className={`relative flex h-48 w-48 flex-col items-center justify-center rounded-full border-8 transition-all duration-200 active:scale-95 shadow-md disabled:opacity-80 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-offset-2 ${
            isPunchedIn
              ? "bg-amber-50 border-amber-400 hover:bg-amber-100 focus:ring-amber-200"
              : "bg-emerald-50 border-emerald-400 hover:bg-emerald-100 focus:ring-emerald-200"
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-950" />
              <span className="text-xs font-semibold text-zinc-600">
                Verifying GPS...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-1">
              <svg
                className={`h-12 w-12 transition-colors ${isPunchedIn ? "text-amber-600" : "text-emerald-600"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              <span
                className={`text-xl font-black ${isPunchedIn ? "text-amber-800" : "text-emerald-800"}`}
              >
                {isPunchedIn ? "PUNCH OUT" : "PUNCH IN"}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                Tap to Log
              </span>
            </div>
          )}
        </button>

        {/* Status Indications */}
        <div className="min-h-[24px] flex flex-col items-center">
          {location && !error && !loading && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              GPS Secured: {location.lat}, {location.lng} (±{location.accuracy}
              m)
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="text-xs text-rose-700 bg-rose-50 px-4 py-2.5 rounded-lg border border-rose-200 font-semibold text-center max-w-xs mt-2"
            >
              ⚠️ {error}
            </div>
          )}
        </div>

        {isPunchedIn && punchInTime && (
          <p className="text-sm font-semibold text-zinc-600 fade-in">
            Punched In today at{" "}
            <span className="text-zinc-900 font-bold">{punchInTime}</span>
          </p>
        )}
      </div>

      {/* Daily Logs Table */}
      {logs.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider border-b pb-2">
            Recent Attendance Log
          </h3>
          <div className="divide-y divide-zinc-100">
            {logs.map((log, index) => {
              const isLogPunchIn = log.type.toUpperCase() === "IN";
              return (
                <div
                  key={index}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        isLogPunchIn
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                      }`}
                    >
                      {log.type.toUpperCase()}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-900">
                        {log.time}
                      </span>
                      <span className="text-xs text-zinc-500">{log.date}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded-full">
                    {log.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
