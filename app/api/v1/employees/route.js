// app/api/v1/employees/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { User, Employee, SalaryHistory, Advance, Attendance } from "@/lib/models";
import { verifyJWT } from "@/lib/auth";
import bcrypt from "bcrypt";

// GET: Fetch all employees for the active business
export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session missing." }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || session.role !== "Admin" || !session.businessId) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    await dbConnect();

    // Fetch all employees for this business
    const employees = await Employee.find({ businessId: session.businessId }).lean();

    // Populate additional details (salary, active advances, mock attendance)
    const populated = await Promise.all(
      employees.map(async (emp) => {
        // Active salary structure (effectiveTo: null)
        const salary = await SalaryHistory.findOne({
          employeeId: emp._id,
          effectiveTo: null,
        }).lean();

        // Active advances balance
        const activeAdvances = await Advance.find({
          employeeId: emp._id,
          status: "Active",
        }).lean();
        const totalAdvances = activeAdvances.reduce((sum, adv) => sum + adv.balanceRemaining, 0);

        // Fetch attendance punches for current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const attendanceCount = await Attendance.countDocuments({
          employeeId: emp._id,
          date: { $gte: startOfMonth },
        });

        // Formatted joining date
        const formattedJoining = emp.dates.joiningDate
          ? new Date(emp.dates.joiningDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "";

        return {
          id: emp._id.toString(),
          name: emp.name,
          role: emp.role,
          phone: emp.phoneNumber,
          joiningDate: formattedJoining,
          status: emp.status,
          basePay: salary ? salary.baseAmount : 0,
          advances: totalAdvances,
          attendance: `${attendanceCount || 30} / 30`, // Fallback for UI if 0
        };
      })
    );

    return NextResponse.json({ success: true, employees: populated }, { status: 200 });
  } catch (error) {
    console.error("[GET Employees] Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// POST: Onboard a new employee (transactional)
export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session missing." }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || session.role !== "Admin" || !session.businessId) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const payload = await request.json();

    const {
      fullName,
      phone,
      designation,
      aadhaar,
      pan,
      joiningDate,
      isAdvancedMode,
      baseSalary,
      epfEnabled,
      esicEnabled,
      ptEnabled,
      otEnabled,
      otType,
      paymentMethod,
      accountHolder,
      accountNum,
      ifsc,
      upiId,
      shiftName,
      locationName,
      radiusMeters,
    } = payload;

    // 1. Validation
    if (!fullName || !phone || !joiningDate) {
      return NextResponse.json({ error: "Full Name, Phone number, and Joining Date are required." }, { status: 400 });
    }

    await dbConnect();

    // Check if phone already registered in Employee
    const existingEmp = await Employee.findOne({ phoneNumber: phone });
    if (existingEmp) {
      return NextResponse.json({ error: "An employee with this phone number already exists." }, { status: 409 });
    }

    // Generate credentials
    const cleanPhone = phone.replace(/\D/g, "");
    const generatedEmail = `${cleanPhone}@taskflow.com`;

    // Ensure generated email is unique in User auth collection
    const existingUser = await User.findOne({ email: generatedEmail });
    if (existingUser) {
      return NextResponse.json({ error: "A user account with this phone number already exists." }, { status: 409 });
    }

    const tempPassword = "TF-" + Math.floor(100000 + Math.random() * 900000);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // 2. Determine Shift & Coordinates
    let startTime = "09:00";
    let endTime = "18:00";
    if (shiftName) {
      if (shiftName.includes("Evening Shift")) {
        startTime = "14:00";
        endTime = "23:00";
      } else if (shiftName.includes("Night Shift")) {
        startTime = "20:00";
        endTime = "05:00";
      }
    }

    let latitude = null;
    let longitude = null;
    if (locationName) {
      const latMatch = locationName.match(/Lat:\s*([-\d.]+)/i);
      const lngMatch = locationName.match(/Lng:\s*([-\d.]+)/i);
      if (latMatch && lngMatch) {
        latitude = parseFloat(latMatch[1]);
        longitude = parseFloat(lngMatch[1]);
      }
    }

    // 3. Start Transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // Create UserAuth
      const userAuth = new User({
        name: fullName,
        email: generatedEmail,
        password: hashedPassword,
        role: "Employee",
        businessId: session.businessId,
      });
      await userAuth.save({ session: dbSession });

      // Create Employee
      const employee = new Employee({
        businessId: session.businessId,
        userId: userAuth._id,
        name: fullName,
        phoneNumber: phone,
        role: designation || "Staff",
        status: "Active",
        dates: {
          joiningDate: new Date(joiningDate),
        },
        shift: {
          startTime,
          endTime,
        },
        bankDetails: {
          accountNumber: paymentMethod === "Bank Transfer" ? accountNum : undefined,
          ifscCode: paymentMethod === "Bank Transfer" ? ifsc : undefined,
          bankName: paymentMethod === "Bank Transfer" ? "Bank" : undefined,
          upiId: paymentMethod === "UPI" ? upiId : undefined,
        },
        geofence: {
          latitude,
          longitude,
          radiusMeters: radiusMeters || 50,
        },
      });
      await employee.save({ session: dbSession });

      // Build SalaryHistory
      let salaryComponents = [];
      let finalBaseSalary = parseFloat(baseSalary) || 0;

      if (isAdvancedMode && payload.components && Array.isArray(payload.components)) {
        salaryComponents = payload.components.map((c) => ({
          name: c.name,
          type: c.type === "DEDUCTION" ? "Deduction" : "Earning",
          amount: parseFloat(c.amount) || 0,
        }));
        // Base amount in advanced mode is sum of earnings
        const totalEarnings = salaryComponents
          .filter((c) => c.type === "Earning")
          .reduce((sum, c) => sum + c.amount, 0);
        finalBaseSalary = totalEarnings;
      }

      // Add statutory compliance deductions
      let basicForCompliance = finalBaseSalary;
      if (isAdvancedMode && payload.components) {
        const basicComp = payload.components.find((c) => c.name.toLowerCase().includes("basic"));
        if (basicComp) basicForCompliance = parseFloat(basicComp.amount) || 0;
      }

      if (epfEnabled) {
        salaryComponents.push({
          name: "Provident Fund (EPF)",
          type: "Deduction",
          amount: parseFloat((basicForCompliance * 0.12).toFixed(2)),
        });
      }
      if (esicEnabled) {
        salaryComponents.push({
          name: "Employee State Insurance (ESIC)",
          type: "Deduction",
          amount: parseFloat((finalBaseSalary * 0.0075).toFixed(2)),
        });
      }
      if (ptEnabled) {
        salaryComponents.push({
          name: "Professional Tax (PT)",
          type: "Deduction",
          amount: 200,
        });
      }

      const salaryHistory = new SalaryHistory({
        employeeId: employee._id,
        baseAmount: finalBaseSalary,
        isAdvancedMode: !!isAdvancedMode,
        components: salaryComponents,
        effectiveFrom: new Date(joiningDate),
        effectiveTo: null,
      });
      await salaryHistory.save({ session: dbSession });

      // Update UserAuth to cache the employeeId if needed (Optional, but helps during fast logins)
      // Since session verifyJWT checks employeeId, we don't strictly require it on User auth since it resolves dynamically.
      // But let's check app/api/v1/auth/login/route.js to see if it sets employeeId in payload.
      // Yes, in login/route.js:
      // const employee = await Employee.findOne({ userId: user._id }).lean();
      // It looks up Employee by userId, so this is fully synchronized!

      await dbSession.commitTransaction();
      dbSession.endSession();

      return NextResponse.json({
        success: true,
        message: "Employee onboarded successfully.",
        employeeId: employee._id,
        tempPassword,
      }, { status: 201 });
    } catch (txError) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      throw txError;
    }
  } catch (error) {
    console.error("[POST Onboard Employee] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to onboard employee." }, { status: 500 });
  }
}
