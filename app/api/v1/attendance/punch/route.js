// app/api/v1/attendance/punch/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Employee, Attendance, OvertimePolicy } from "@/lib/models";
import { verifyJWT } from "@/lib/auth";
import { z } from "zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Initialize plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const punchSchema = z.object({
  latitude: z.number({ required_error: "Latitude coordinate is required" }),
  longitude: z.number({ required_error: "Longitude coordinate is required" }),
});

const EARTH_RADIUS_METERS = 6371000;
const TIMEZONE = "Asia/Kolkata";

/**
 * Calculates distance between two points in meters using the Haversine formula
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export async function POST(request) {
  try {
    // 1. Session Authentication
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Session token is missing. Please log in again." },
        { status: 401 },
      );
    }

    const session = await verifyJWT(token);
    if (!session || session.role !== "Employee") {
      return NextResponse.json(
        { error: "Unauthorized access: Employees only." },
        { status: 403 },
      );
    }

    // 2. Validate payload schema
    const json = await request.json();
    const parseResult = punchSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid coordinate payload structure",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }
    const { latitude, longitude } = parseResult.data;

    // 3. Connect to Database & fetch Employee profile
    await dbConnect();
    const employee = await Employee.findById(session.employeeId).lean();
    if (!employee) {
      return NextResponse.json(
        { error: "Employee profile not found." },
        { status: 404 },
      );
    }

    // 4. Geofencing Coordinates Validation (Haversine Check)
    let distanceMeters = 0;
    const verified = true;

    if (employee.geofence?.latitude && employee.geofence?.longitude) {
      const {
        latitude: storeLat,
        longitude: storeLng,
        radiusMeters,
      } = employee.geofence;
      const allowedRadius = radiusMeters || 50;

      distanceMeters = calculateHaversineDistance(
        latitude,
        longitude,
        storeLat,
        storeLng,
      );

      if (distanceMeters > allowedRadius) {
        return NextResponse.json(
          {
            error: "GPS Deviation",
            message:
              "Punch blocked: You are outside the allowed branch boundary.",
            details: {
              distance: parseFloat(distanceMeters.toFixed(1)),
              allowedRadius,
            },
          },
          { status: 403 },
        );
      }
    } else {
      console.warn(
        `Geofence coordinates missing for employee ${employee._id}. Bypassing GPS check.`,
      );
    }

    // 5. Timezone-Aware Context & Data Fetching
    const now = dayjs().tz(TIMEZONE);
    const startOfDay = now.startOf("day").toDate();
    const endOfDay = now.endOf("day").toDate();

    // PERFORMANCE OPTIMIZATION: Fetch Attendance and Policy concurrently
    let [attendance, policy] = await Promise.all([
      Attendance.findOne({
        employeeId: employee._id,
        date: { $gte: startOfDay, $lte: endOfDay },
      }),
      OvertimePolicy.findOne({ businessId: employee.businessId }).lean(),
    ]);

    const newPunch = {
      type: "In",
      timestamp: now.toDate(),
      location: { latitude, longitude, verified },
    };

    let responseMessage = "";
    let punchType = "In";

    // 6. Stateful Punch Processing
    if (!attendance) {
      // Logic: First punch of the day (Punch In)
      const gracePeriodMinutes = policy?.gracePeriodMinutes ?? 15;
      const shiftStartTimeStr = employee.shift?.startTime || "09:00";
      const [shiftH, shiftM] = shiftStartTimeStr.split(":").map(Number);

      // Construct exact shift start time for today
      const shiftStart = now
        .hour(shiftH)
        .minute(shiftM)
        .second(0)
        .millisecond(0);

      // Calculate lateness in minutes
      const isLate = now.diff(shiftStart, "minute") > gracePeriodMinutes;

      attendance = new Attendance({
        employeeId: employee._id,
        businessId: employee.businessId,
        date: startOfDay,
        punches: [newPunch],
        calculatedHours: 0,
        isLate,
        isOvertime: false,
      });

      responseMessage = "Clocked in successfully.";
    } else {
      // Logic: Subsequent punches (Toggle In/Out)
      const lastPunch = attendance.punches[attendance.punches.length - 1];
      punchType = lastPunch?.type === "In" ? "Out" : "In";
      newPunch.type = punchType;

      attendance.punches.push(newPunch);

      if (punchType === "Out") {
        let totalMs = 0;
        const punchesArray = attendance.punches;

        // Efficient loop to accumulate paired punch durations
        for (let i = 0; i < punchesArray.length; i++) {
          if (
            punchesArray[i].type === "In" &&
            punchesArray[i + 1]?.type === "Out"
          ) {
            totalMs += dayjs(punchesArray[i + 1].timestamp).diff(
              dayjs(punchesArray[i].timestamp),
            );
          }
        }

        const totalHours = totalMs / (1000 * 60 * 60);
        attendance.calculatedHours = parseFloat(totalHours.toFixed(2));

        // Evaluate Overtime
        const dailyThreshold = policy?.threshold?.dailyHours ?? 8;
        attendance.isOvertime = attendance.calculatedHours > dailyThreshold;

        responseMessage = "Clocked out successfully.";
      } else {
        responseMessage = "Returned from break (Clocked in).";
      }
    }

    await attendance.save();

    return NextResponse.json(
      {
        success: true,
        message: responseMessage,
        punch: {
          type: punchType,
          timestamp: newPunch.timestamp.toISOString(),
          distanceMeters: parseFloat(distanceMeters.toFixed(1)),
        },
        attendance: {
          calculatedHours: attendance.calculatedHours,
          isLate: attendance.isLate,
          isOvertime: attendance.isOvertime,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Attendance Punch API] Error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
