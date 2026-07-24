// app/api/v1/employees/[id]/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { Employee, SalaryHistory, Advance, Attendance, Leave, User } from "@/lib/models";
import { verifyJWT } from "@/lib/auth";

// GET: Fetch 360° profile for a single employee including attendance metrics, leaves, documents & financials
export async function GET(request, { params }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session missing." }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || !session.businessId) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const resolvedParams = await params;
    const employeeId = resolvedParams?.id;
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({ error: "Invalid employee ID." }, { status: 400 });
    }

    await dbConnect();

    // 1. Fetch Employee record
    const employee = await Employee.findOne({
      _id: employeeId,
      businessId: session.businessId,
    }).lean();

    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    // 2. Aggregate Attendance stats for current month & recent logs
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const attendanceRecords = await Attendance.find({
      employeeId: employee._id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    })
      .sort({ date: -1 })
      .lean();

    const presentDays = attendanceRecords.filter((a) => a.punches && a.punches.length > 0).length;
    const lateArrivals = attendanceRecords.filter((a) => a.isLate).length;
    const totalHoursWorked = attendanceRecords.reduce((sum, a) => sum + (a.calculatedHours || 0), 0);

    // 3. Fetch Leaves history
    const leaves = await Leave.find({
      employeeId: employee._id,
      businessId: session.businessId,
    })
      .sort({ startDate: -1 })
      .lean();

    // 4. Fetch Active & Historical Salary
    const currentSalary = await SalaryHistory.findOne({
      employeeId: employee._id,
      effectiveTo: null,
    }).lean();

    const salaryHistory = await SalaryHistory.find({
      employeeId: employee._id,
    })
      .sort({ effectiveFrom: -1 })
      .lean();

    // 5. Fetch Active Advances
    const advances = await Advance.find({
      employeeId: employee._id,
      businessId: session.businessId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const activeAdvanceTotal = advances
      .filter((a) => a.status === "Active")
      .reduce((sum, a) => sum + (a.balanceRemaining || 0), 0);

    // 6. User account details (if linked)
    let linkedUser = null;
    if (employee.userId) {
      linkedUser = await User.findById(employee.userId).select("email role createdAt").lean();
    }

    return NextResponse.json({
      success: true,
      employee: {
        ...employee,
        email: employee.email || linkedUser?.email || "",
      },
      stats: {
        presentDays,
        lateArrivals,
        totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
        workingDaysInMonth: endOfMonth.getDate(),
        attendancePercentage: Math.round((presentDays / (now.getDate() || 1)) * 100),
      },
      attendanceLogs: attendanceRecords,
      leaves,
      currentSalary,
      salaryHistory,
      advances,
      activeAdvanceTotal,
    });
  } catch (error) {
    console.error("[GET Employee 360 Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee 360 details.", details: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Update employee personal, bank, documents, or shift details
export async function PATCH(request, { params }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session missing." }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || session.role !== "Admin" || !session.businessId) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const resolvedParams = await params;
    const employeeId = resolvedParams?.id;
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({ error: "Invalid employee ID." }, { status: 400 });
    }

    const body = await request.json();
    await dbConnect();

    // Prepare update object safely
    const updateData = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber.trim();
    if (body.role !== undefined) updateData.role = body.role.trim();
    if (body.department !== undefined) updateData.department = body.department.trim();
    if (body.email !== undefined) updateData.email = body.email.trim();

    if (body.status !== undefined && ["Active", "Exited"].includes(body.status)) {
      updateData.status = body.status;
      if (body.status === "Exited" && !body.exitDate) {
        updateData["dates.exitDate"] = new Date();
      }
    }

    if (body.shift) {
      if (body.shift.startTime) updateData["shift.startTime"] = body.shift.startTime;
      if (body.shift.endTime) updateData["shift.endTime"] = body.shift.endTime;
    }

    if (body.bankDetails) {
      if (body.bankDetails.accountNumber !== undefined)
        updateData["bankDetails.accountNumber"] = body.bankDetails.accountNumber;
      if (body.bankDetails.ifscCode !== undefined)
        updateData["bankDetails.ifscCode"] = body.bankDetails.ifscCode;
      if (body.bankDetails.bankName !== undefined)
        updateData["bankDetails.bankName"] = body.bankDetails.bankName;
      if (body.bankDetails.upiId !== undefined)
        updateData["bankDetails.upiId"] = body.bankDetails.upiId;
    }

    if (body.documents) {
      if (body.documents.resumeUrl !== undefined)
        updateData["documents.resumeUrl"] = body.documents.resumeUrl.trim();
      if (body.documents.appointmentLetterUrl !== undefined)
        updateData["documents.appointmentLetterUrl"] = body.documents.appointmentLetterUrl.trim();
      if (body.documents.idProofUrl !== undefined)
        updateData["documents.idProofUrl"] = body.documents.idProofUrl.trim();
      if (body.documents.otherDocs !== undefined)
        updateData["documents.otherDocs"] = body.documents.otherDocs;
    }

    if (body.emergencyContact) {
      if (body.emergencyContact.name !== undefined)
        updateData["emergencyContact.name"] = body.emergencyContact.name;
      if (body.emergencyContact.relationship !== undefined)
        updateData["emergencyContact.relationship"] = body.emergencyContact.relationship;
      if (body.emergencyContact.phone !== undefined)
        updateData["emergencyContact.phone"] = body.emergencyContact.phone;
    }

    if (body.aadhaar !== undefined) updateData.aadhaar = body.aadhaar.trim();
    if (body.pan !== undefined) updateData.pan = body.pan.trim();

    const updatedEmployee = await Employee.findOneAndUpdate(
      { _id: employeeId, businessId: session.businessId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedEmployee) {
      return NextResponse.json({ error: "Employee not found or access denied." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Employee profile updated successfully.",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("[PATCH Employee 360 Error]:", error);
    return NextResponse.json(
      { error: "Failed to update employee details.", details: error.message },
      { status: 500 }
    );
  }
}
