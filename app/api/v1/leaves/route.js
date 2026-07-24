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

      // Calculate sick and casual leaves taken or pending (already deducted from available balances)
      const sickTakenOrPending = leaves
        .filter((l) => (l.type === "Sick" || l.type === "Sick Leave") && (l.status === "Approved" || l.status === "Pending"))
        .reduce((sum, l) => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
          return sum + diffDays;
        }, 0);

      const casualTakenOrPending = leaves
        .filter((l) => (l.type === "Casual" || l.type === "Casual Leave") && (l.status === "Approved" || l.status === "Pending"))
        .reduce((sum, l) => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
          return sum + diffDays;
        }, 0);

      return NextResponse.json(
        {
          success: true,
          balances: {
            sick: employee.leaveBalances.sick,
            maxSick: employee.leaveBalances.sick + sickTakenOrPending,
            casual: employee.leaveBalances.casual,
            maxCasual: employee.leaveBalances.casual + casualTakenOrPending,
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
      if (!leaves || leaves.length === 0) {
        return NextResponse.json({ success: true, leaves: [] }, { status: 200 });
      }

      // Batch fetch distinct employees in 1 query
      const uniqueEmpIds = [...new Set(leaves.map((l) => l.employeeId.toString()))];
      const employees = await Employee.find({ _id: { $in: uniqueEmpIds } })
        .select("name role phoneNumber leaveBalances")
        .lean();

      const empMap = new Map(employees.map((e) => [e._id.toString(), e]));

      // Pre-compute sick/casual days taken across all leaves in memory
      const takenSickMap = new Map();
      const takenCasualMap = new Map();

      leaves.forEach((l) => {
        if (l.status === "Approved" || l.status === "Pending") {
          const empIdStr = l.employeeId.toString();
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

          if (l.type === "Sick" || l.type === "Sick Leave") {
            takenSickMap.set(empIdStr, (takenSickMap.get(empIdStr) || 0) + diffDays);
          } else if (l.type === "Casual" || l.type === "Casual Leave") {
            takenCasualMap.set(empIdStr, (takenCasualMap.get(empIdStr) || 0) + diffDays);
          }
        }
      });

      // Populate leave records in memory
      const populated = leaves.map((l) => {
        const empIdStr = l.employeeId.toString();
        const emp = empMap.get(empIdStr);
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

        let currentSick = emp?.leaveBalances?.sick ?? 5;
        let currentCasual = emp?.leaveBalances?.casual ?? 6;
        const sTaken = takenSickMap.get(empIdStr) || 0;
        const cTaken = takenCasualMap.get(empIdStr) || 0;
        const maxSick = currentSick + sTaken;
        const maxCasual = currentCasual + cTaken;

        return {
          id: l._id.toString(),
          employeeId: empIdStr,
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
          leaveBalances: {
            sick: currentSick,
            maxSick: maxSick,
            casual: currentCasual,
            maxCasual: maxCasual,
          },
        };
      });

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
