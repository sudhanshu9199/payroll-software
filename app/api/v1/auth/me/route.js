// app/api/v1/auth/me/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User, Business, Employee } from "@/lib/models";
import { verifyJWT } from "@/lib/auth";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session missing." }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(session.userId).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    let businessName = "TaskFlow Company";
    let businessId = user.businessId?.toString() || null;
    let employeeId = session.employeeId || null;

    if (user.role === "Admin" && businessId) {
      const biz = await Business.findById(businessId).lean();
      if (biz) {
        businessName = biz.name;
      }
    } else if (user.role === "Employee") {
      const emp = await Employee.findOne({ userId: user._id }).lean();
      if (emp) {
        employeeId = emp._id.toString();
        if (emp.businessId) {
          businessId = emp.businessId.toString();
          const biz = await Business.findById(emp.businessId).lean();
          if (biz) {
            businessName = biz.name;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        businessId,
        employeeId,
      },
      business: {
        name: businessName,
      },
    });
  } catch (error) {
    console.error("[GET Auth Me] Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
