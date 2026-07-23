// app/api/v1/attendance/status/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Attendance } from "@/lib/models";
import { verifyJWT } from "@/lib/auth";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Initialize plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export async function GET(request) {
  try {
    // 1. Session Authentication
    const token = request.cookies.get("token")?.value;
    if (!token)
      return NextResponse.json({ error: "Session missing." }, { status: 401 });

    const session = await verifyJWT(token);
    if (!session || session.role !== "Employee") {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 403 },
      );
    }

    let employeeId = session.employeeId;
    if (!employeeId) {
      const { Employee } = await import("@/lib/models");
      const empDoc = await Employee.findOne({ userId: session.userId }).lean();
      if (!empDoc) {
        return NextResponse.json({ error: "Employee profile not found." }, { status: 404 });
      }
      employeeId = empDoc._id.toString();
    }

    // 2. Connect to Database
    await dbConnect();

    // 3. Timezone-Aware Day Bounds (Assuming India timezone)
    const TIMEZONE = "Asia/Kolkata";
    const startOfDay = dayjs().tz(TIMEZONE).startOf("day").toDate();
    const endOfDay = dayjs().tz(TIMEZONE).endOf("day").toDate();

    const attendance = await Attendance.findOne({
      employeeId,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    // 4. Handle Empty State
    if (!attendance || !attendance.punches || attendance.punches.length === 0) {
      return NextResponse.json(
        { status: "OUT", punchInTime: null, logs: [] },
        { status: 200 },
      );
    }

    // 5. Process Data (Return raw ISO strings, let client format them)
    const firstPunch = attendance.punches[0];
    const lastPunch = attendance.punches[attendance.punches.length - 1];
    const punchState = lastPunch.type === "In" ? "IN" : "OUT";

    const formattedLogs = attendance.punches
      .map((p) => ({
        type: p.type === "In" ? "IN" : "OUT",
        timestamp: new Date(p.timestamp).toISOString(), // Frontend handles AM/PM
        status: p.location?.verified ? "Verified" : "Bypassed",
      }))
      .reverse();

    return NextResponse.json(
      {
        status: punchState,
        punchInTime: new Date(firstPunch.timestamp).toISOString(),
        logs: formattedLogs,
      },
      { status: 200 },
    );
  } catch (error) {
    // Consider replacing console.error with a logging service like Sentry or Datadog
    console.error("[Attendance Status API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
