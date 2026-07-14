// app/api/v1/leaves/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Employee, Leave } from "@/lib/models";
import { verifyJWT } from "@/lib/auth";

// GET: Retrieve leave balances & history
export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session missing." }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    await dbConnect();

    if (session.role === "Employee") {
      let employeeId = session.employeeId;
      if (!employeeId) {
        const empDoc = await Employee.findOne({ userId: session.userId });
        if (!empDoc) {
          return NextResponse.json({ error: "Employee profile not found." }, { status: 404 });
        }
        employeeId = empDoc._id.toString();
      }

      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return NextResponse.json({ error: "Employee profile not found." }, { status: 404 });
      }

      // Initialize leaveBalances if missing
      let balancesUpdated = false;
      if (!employee.leaveBalances) {
        employee.leaveBalances = { sick: 5, casual: 6 };
        balancesUpdated = true;
      } else {
        if (employee.leaveBalances.sick === undefined) {
          employee.leaveBalances.sick = 5;
          balancesUpdated = true;
        }
        if (employee.leaveBalances.casual === undefined) {
          employee.leaveBalances.casual = 6;
          balancesUpdated = true;
        }
      }
      if (balancesUpdated) {
        employee.markModified("leaveBalances");
        await employee.save();
      }

      // Fetch all leaves for this employee
      const leaves = await Leave.find({ employeeId }).sort({ startDate: -1 }).lean();

      // Calculate unpaid leaves taken (Approved and type is Unpaid)
      const unpaidTaken = leaves
        .filter((l) => l.type === "Unpaid" && l.status === "Approved")
        .reduce((sum, l) => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
          return sum + diffDays;
        }, 0);

      const formattedLeaves = leaves.map((l) => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        return {
          id: l._id.toString(),
          type: l.type === "Sick" ? "Sick Leave" : l.type === "Casual" ? "Casual Leave" : "Unpaid Leave",
          startDate: l.startDate,
          endDate: l.endDate,
          dates: `${start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`,
          days: diffDays,
          status: l.status,
          isPaid: l.isPaid,
          reason: l.reason || "",
        };
      });

      return NextResponse.json(
        {
          success: true,
          balances: {
            sick: employee.leaveBalances.sick,
            casual: employee.leaveBalances.casual,
            unpaid: unpaidTaken,
          },
          leaves: formattedLeaves,
        },
        { status: 200 }
      );
    } else if (session.role === "Admin") {
      if (!session.businessId) {
        return NextResponse.json({ error: "Unauthorized access: Business context missing." }, { status: 403 });
      }

      // Fetch leaves for the active business
      const leaves = await Leave.find({ businessId: session.businessId }).sort({ startDate: -1 }).lean();

      // Populate employee details
      const populated = await Promise.all(
        leaves.map(async (l) => {
          const emp = await Employee.findById(l.employeeId).lean();
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
          return {
            id: l._id.toString(),
            employeeId: l.employeeId.toString(),
            name: emp ? emp.name : "Unknown Employee",
            role: emp ? emp.role : "Staff",
            type: l.type === "Sick" ? "Sick Leave" : l.type === "Casual" ? "Casual Leave" : "Unpaid Leave",
            startDate: l.startDate,
            endDate: l.endDate,
            dates: `${start.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`,
            days: diffDays,
            status: l.status,
            isPaid: l.isPaid,
            reason: l.reason || "",
            leaveBalances: emp ? (emp.leaveBalances || { sick: 5, casual: 6 }) : { sick: 5, casual: 6 }
          };
        })
      );

      return NextResponse.json({ success: true, leaves: populated }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid role." }, { status: 403 });
  } catch (error) {
    console.error("[GET Leaves] Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// POST: Request a new leave
export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session missing." }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const payload = await request.json();
    const { startDate, endDate, leaveType, reason } = payload;

    if (!startDate || !endDate || !leaveType) {
      return NextResponse.json({ error: "Start date, end date, and leave type are required." }, { status: 400 });
    }

    await dbConnect();

    // Map leave type from UI friendly to schema Enum
    let dbType = "Unpaid";
    if (leaveType === "Sick Leave" || leaveType === "Sick") {
      dbType = "Sick";
    } else if (leaveType === "Casual Leave" || leaveType === "Casual") {
      dbType = "Casual";
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
    }

    if (end < start) {
      return NextResponse.json({ error: "End date cannot be before start date." }, { status: 400 });
    }

    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Resolve Employee ID
    let employeeId = session.employeeId;
    if (session.role === "Admin") {
      // Admins should specify employeeId in the request if requesting on behalf of someone
      employeeId = payload.employeeId || session.employeeId;
    }

    if (!employeeId && session.role === "Employee") {
      const empDoc = await Employee.findOne({ userId: session.userId });
      if (empDoc) employeeId = empDoc._id.toString();
    }

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required." }, { status: 400 });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: "Employee profile not found." }, { status: 404 });
    }

    // Initialize leaveBalances if missing
    if (!employee.leaveBalances) {
      employee.leaveBalances = { sick: 5, casual: 6 };
    } else {
      if (employee.leaveBalances.sick === undefined) employee.leaveBalances.sick = 5;
      if (employee.leaveBalances.casual === undefined) employee.leaveBalances.casual = 6;
    }

    // If Sick or Casual, check and decrement quota
    if (dbType === "Sick" || dbType === "Casual") {
      const balanceKey = dbType.toLowerCase();
      const currentBalance = employee.leaveBalances[balanceKey];

      if (currentBalance < diffDays) {
        return NextResponse.json(
          { error: `Insufficient ${dbType} leave balance. Available: ${currentBalance} days, requested: ${diffDays} days.` },
          { status: 400 }
        );
      }

      // Decrement the quota
      employee.leaveBalances[balanceKey] = currentBalance - diffDays;
      employee.markModified("leaveBalances");
      await employee.save();
    }

    // Save the Leave request
    const newLeave = new Leave({
      employeeId: employee._id,
      businessId: employee.businessId,
      startDate: start,
      endDate: end,
      type: dbType,
      status: "Pending",
      isPaid: false, // Remains unpaid until approved
      reason: reason || "",
    });

    await newLeave.save();

    return NextResponse.json(
      {
        success: true,
        message: "Leave request submitted successfully.",
        leave: {
          id: newLeave._id.toString(),
          type: leaveType,
          startDate: newLeave.startDate,
          endDate: newLeave.endDate,
          days: diffDays,
          status: newLeave.status,
          isPaid: newLeave.isPaid,
          reason: newLeave.reason,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST Leaves] Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
