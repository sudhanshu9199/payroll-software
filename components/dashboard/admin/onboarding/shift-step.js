// components/dashboard/admin/onboarding/shift-step.js
"use client";

import { useState } from "react";

export default function ShiftStep({ data, update }) {
  const [fetchingCoords, setFetchingCoords] = useState(false);

  const fetchCoordinates = () => {
    setFetchingCoords(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          update({ locationName: `Verified Store coords (Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)})` });
          setFetchingCoords(false);
        },
        () => {
          alert("Could not fetch branch coordinates. Default location coordinates applied.");
          setFetchingCoords(false);
        }
      );
    } else {
      setFetchingCoords(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-md font-bold text-zinc-900 border-b pb-2">4. Operations & Geofencing</h3>
        <p className="text-xs text-zinc-500 mt-1">Assign work schedule and specify the GPS coordinate boundary for attendance verification.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase">Assigned Shift</label>
          <select
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2.5 bg-white text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
            value={data.shiftName}
            onChange={(e) => update({ shiftName: e.target.value })}
          >
            <option value="Day Shift (9 AM - 6 PM)">Day Shift (9:00 AM - 6:00 PM)</option>
            <option value="General Shift (9 AM - 6 PM)">General Shift (9:00 AM - 6:00 PM)</option>
            <option value="Evening Shift (2 PM - 11 PM)">Evening Shift (2:00 PM - 11:00 PM)</option>
            <option value="Night Shift (8 PM - 5 AM)">Night Shift (8:00 PM - 5:00 AM)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase">Late Entry Grace Period (Mins)</label>
          <input
            type="number"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
            placeholder="e.g. 15"
            value={data.gracePeriod}
            onChange={(e) => update({ gracePeriod: parseInt(e.target.value) })}
          />
        </div>
      </div>

      {/* Geofencing Configuration */}
      <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm font-bold text-zinc-900 block">Geofencing & GPS Validation</span>
            <span className="text-xs text-zinc-500">Prevent proxy attendance. Employees can only punch-in inside these bounds.</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase">Worksite Location coordinates</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-950 focus:outline-none text-sm"
                value={data.locationName}
                onChange={(e) => update({ locationName: e.target.value })}
                placeholder="Hajipur Main Branch"
              />
              <button
                type="button"
                onClick={fetchCoordinates}
                disabled={fetchingCoords}
                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                {fetchingCoords ? "Locating..." : "Use Current GPS"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase">Geofencing Radius</label>
            <select
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2.5 bg-white text-zinc-900 focus:border-zinc-950 focus:outline-none text-xs"
              defaultValue="50"
            >
              <option value="20">Strict (20 meters)</option>
              <option value="50">Standard (50 meters)</option>
              <option value="100">Medium (100 meters)</option>
              <option value="500">Relaxed (500 meters)</option>
            </select>
            <span className="text-[10px] text-zinc-400 block mt-1">
              Employees attempting to punch outside this radius will be blocked with a GPS deviation warning.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
