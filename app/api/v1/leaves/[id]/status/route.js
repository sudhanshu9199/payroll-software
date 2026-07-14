// app/api/v1/leaves/[id]/status/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Leave, Employee } from "@/lib/models";
import { verifyJWT } from "@/lib/auth";

export async function PATCH(request, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session missing." }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || session.role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized access. Admin role required." }, { status: 403 });
    }

    const payload = await request.json();
    const { status } = payload;

    if (!status || !["Approved", "Rejected"].includes(status)) {
      return NextResponse.json({ error: "Valid status ('Approved' or 'Rejected') is required." }, { status: 400 });
    }

    await dbConnect();

    // Find the leave request
    const leave = await Leave.findById(id);
    if (!leave) {
      return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
    }

    // Verify it belongs to the admin's business
    if (leave.businessId.toString() !== session.businessId) {
      return NextResponse.json({ error: "Unauthorized access to this leave record." }, { status: 403 });
    }

    // Check if already processed
    if (leave.status !== "Pending") {
      return NextResponse.json({ error: "Leave request has already been processed." }, { status: 400 });
    }

    const employee = await Employee.findById(leave.employeeId);
    if (!employee) {
      return NextResponse.json({ error: "Employee profile associated with this leave not found." }, { status: 404 });
    }

    // Calculate request days
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (status === "Approved") {
      leave.status = "Approved";
      // Sick/Casual are paid leaves. Unpaid is loss of pay.
      leave.isPaid = leave.type === "Sick" || leave.type === "Casual";
    } else if (status === "Rejected") {
      leave.status = "Rejected";
      leave.isPaid = false;

      // If it was Sick or Casual, restore the quota back to the employee
      if (leave.type === "Sick" || leave.type === "Casual") {
        const balanceKey = leave.type.toLowerCase();
        if (!employee.leaveBalances) {
          employee.leaveBalances = { sick: 5, casual: 6 };
        } else {
          if (employee.leaveBalances[balanceKey] === undefined) {
            employee.leaveBalances[balanceKey] = balanceKey === "sick" ? 5 : 6;
          }
        }

        // Add back the days
        employee.leaveBalances[balanceKey] += diffDays;
        employee.markModified("leaveBalances");
        await employee.save();
      }
    }

    await leave.save();

    return NextResponse.json(
      {
        success: true,
        message: `Leave request successfully ${status.toLowerCase()}ed.`,
        leave: {
          id: leave._id.toString(),
          status: leave.status,
          isPaid: leave.isPaid,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH Leave Status] Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
