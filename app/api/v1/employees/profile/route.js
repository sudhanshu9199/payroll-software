// app/api/v1/employees/profile/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { User, Employee, SalaryHistory } from "@/lib/models";
import { verifyJWT } from "@/lib/auth";
import bcrypt from "bcrypt";

// GET: Retrieve detailed profile for the employee
export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session missing." }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    await dbConnect();

    let employeeId = session.employeeId;

    // Allow Admin to request a specific employee's details
    if (session.role === "Admin") {
      const { searchParams } = new URL(request.url);
      employeeId = searchParams.get("employeeId") || employeeId;
    }

    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      // Find employee by userId
      const emp = await Employee.findOne({ userId: session.userId }).lean();
      if (!emp) {
        return NextResponse.json({ error: "Employee profile not found." }, { status: 404 });
      }
      employeeId = emp._id.toString();
    }

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) {
      return NextResponse.json({ error: "Employee profile not found." }, { status: 404 });
    }

    // Double check auth association for employee security
    if (session.role === "Employee" && employee.userId?.toString() !== session.userId) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    // Retrieve active salary history
    const salary = await SalaryHistory.findOne({
      employeeId: employee._id,
      effectiveTo: null,
    }).lean();

    // Format shift timings nicely
    const formatTime = (timeStr) => {
      if (!timeStr) return "";
      const [hoursStr, minutesStr] = timeStr.split(":");
      const hours = parseInt(hoursStr, 10);
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutesStr} ${ampm}`;
    };

    const startTimeFormatted = formatTime(employee.shift?.startTime || "09:00");
    const endTimeFormatted = formatTime(employee.shift?.endTime || "18:00");
    const shiftTiming = startTimeFormatted && endTimeFormatted 
      ? `Shift (${startTimeFormatted} - ${endTimeFormatted})`
      : "Standard Shift (9:00 AM - 6:00 PM)";

    // Format Aadhaar & PAN for partial masking in UI
    const maskValue = (val, maskLength = 4) => {
      if (!val) return "Not Provided";
      if (val.length <= maskLength) return val;
      return "X".repeat(val.length - maskLength) + val.slice(-maskLength);
    };

    return NextResponse.json({
      success: true,
      profile: {
        id: employee._id.toString(),
        name: employee.name,
        phone: employee.phoneNumber,
        designation: employee.role,
        aadhaar: employee.aadhaar || "",
        maskedAadhaar: maskValue(employee.aadhaar, 4),
        pan: employee.pan || "",
        maskedPan: maskValue(employee.pan, 4),
        shift: shiftTiming,
        basePay: salary ? salary.baseAmount : 0,
        bankDetails: {
          accountNumber: employee.bankDetails?.accountNumber || "",
          maskedAccountNumber: maskValue(employee.bankDetails?.accountNumber, 4),
          ifscCode: employee.bankDetails?.ifscCode || "Not Provided",
          bankName: employee.bankDetails?.bankName || "Not Provided",
          upiId: employee.bankDetails?.upiId || "Not Provided",
        },
      },
    }, { status: 200 });

  } catch (error) {
    console.error("[GET Profile] Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// POST: Update Employee / User Password
export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session missing." }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const body = await request.json();
    const { oldPassword, newPassword, confirmPassword } = body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "All password fields are required." }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
    }

    await dbConnect();

    // Find the user document
    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User record not found." }, { status: 404 });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    }, { status: 200 });

  } catch (error) {
    console.error("[POST Update Password] Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
