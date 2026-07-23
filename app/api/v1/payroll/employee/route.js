import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { PayrollRecord, Employee } from "@/lib/models";
import { verifyJWT } from "@/lib/auth";

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

    let employeeIdToQuery = null;

    if (session.role === "Employee") {
      employeeIdToQuery = session.employeeId;
      if (!employeeIdToQuery || !mongoose.Types.ObjectId.isValid(employeeIdToQuery)) {
        const empDoc = await Employee.findOne({ userId: session.userId }).lean();
        if (empDoc) {
          employeeIdToQuery = empDoc._id.toString();
        }
      }
    } else if (session.role === "Admin") {
      const { searchParams } = new URL(request.url);
      employeeIdToQuery = searchParams.get("employeeId");
      if (!employeeIdToQuery || !mongoose.Types.ObjectId.isValid(employeeIdToQuery)) {
        return NextResponse.json(
          { error: "Valid employeeId query parameter is required for Admin view." },
          { status: 400 }
        );
      }

      // Check if employee belongs to the admin's business
      const employee = await Employee.findById(employeeIdToQuery).lean();
      if (!employee || employee.businessId.toString() !== session.businessId) {
        return NextResponse.json(
          { error: "Unauthorized access to employee data." },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json({ error: "Unauthorized role." }, { status: 403 });
    }

    if (!employeeIdToQuery) {
      return NextResponse.json(
        { error: "Employee association not found." },
        { status: 404 }
      );
    }

    // Fetch payroll records sorted by period descending
    const records = await PayrollRecord.find({ employeeId: employeeIdToQuery })
      .sort({ "payPeriod.year": -1, "payPeriod.month": -1 })
      .lean();

    const formattedRecords = records.map((rec) => {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthName = monthNames[rec.payPeriod.month - 1] || "";
      const year = rec.payPeriod.year;

      // Extract details from snapshots and database record
      const basicPay = rec.salarySnapshot?.basicPay ?? rec.salarySnapshot?.baseAmount ?? 0;
      const allowances = rec.salarySnapshot?.allowances ?? 0;
      const overtimePay = rec.salarySnapshot?.overtimePay ?? 0;
      const bonuses = rec.salarySnapshot?.bonuses ?? [];
      const totalBonusAmount = bonuses.reduce((sum, b) => sum + b.amount, 0);

      const unpaidLeaves = rec.aggregatedData?.unpaidLeaves ?? 0;
      const totalPresentDays = rec.aggregatedData?.totalPresentDays ?? 0;
      const totalAbsentDays = rec.aggregatedData?.totalAbsentDays ?? 0;
      const overtimeHours = rec.aggregatedData?.overtimeHours ?? 0;

      // Build earnings array
      const earnings = [
        { name: "Basic Salary", amount: basicPay },
        { name: "Allowances", amount: allowances },
      ];

      if (overtimeHours > 0) {
        earnings.push({ name: `Overtime (${overtimeHours} hrs)`, amount: overtimePay });
      }

      bonuses.forEach((b) => {
        earnings.push({ name: `Bonus: ${b.title}`, amount: b.amount });
      });

      const totalEarnings = basicPay + allowances + overtimePay + totalBonusAmount;

      // Build deductions array
      const deductions = [];
      const unpaidLeavesAmount = rec.deductions?.unpaidLeavesAmount ?? 0;
      if (unpaidLeavesAmount > 0) {
        deductions.push({ name: `Unpaid Leaves (${unpaidLeaves} days)`, amount: unpaidLeavesAmount });
      }

      const advanceRecovery = rec.deductions?.advanceRecovery ?? 0;
      if (advanceRecovery > 0) {
        deductions.push({ name: "Advance Recovery", amount: advanceRecovery });
      }

      const taxes = rec.deductions?.taxes ?? 0;
      if (taxes > 0) {
        deductions.push({ name: "Taxes / Professional Tax", amount: taxes });
      }

      // Add statutory compliance deductions if any
      const otherDeductionKeys = Object.keys(rec.deductions || {}).filter(
        (k) => !["unpaidLeavesAmount", "advanceRecovery", "taxes", "_recoveries", "_bonuses"].includes(k)
      );

      otherDeductionKeys.forEach((key) => {
        const val = rec.deductions[key];
        if (typeof val === "number" && val > 0) {
          deductions.push({ name: key, amount: val });
        }
      });

      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

      return {
        id: rec._id.toString(),
        month: `${monthName} ${year}`,
        netPay: rec.netPay,
        daysWorked: `${totalPresentDays} / 30`,
        status: rec.status,
        payslipUrl: rec.payslipUrl || null,
        grossEarnings: totalEarnings,
        totalDeductions,
        earnings,
        deductions,
      };
    });

    return NextResponse.json({ success: true, payslips: formattedRecords }, { status: 200 });
  } catch (error) {
    console.error("[GET Employee Payslips] Error:", error);
    return NextResponse.json({ error: "Failed to fetch payslips." }, { status: 500 });
  }
}
