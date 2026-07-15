import fs from "fs";
import mongoose from "mongoose";

// 1. Parse .env.local manually first
try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  }
  console.log("Environment variables loaded successfully.");
} catch (e) {
  console.log("No .env.local found or error reading it:", e.message);
}

// 2. Dynamically import database and models
const { default: dbConnect } = await import("../lib/db.js");
const {
  Business,
  Employee,
  Attendance,
  Leave,
  Advance,
  Bonus,
  SalaryHistory,
  PayrollRecord,
  OvertimePolicy
} = await import("../lib/models.js");
const { signJWT } = await import("../lib/auth.js");

const businessId = "60b8d295f1d2c72b8c9b14f1";
const employeeId = "60b8d295f1d2c72b8c9b14f2";

async function run() {
  console.log("Connecting to Database...");
  await dbConnect();

  console.log("Cleaning up old test data...");
  await Promise.all([
    Business.deleteOne({ _id: businessId }),
    Employee.deleteOne({ _id: employeeId }),
    Attendance.deleteMany({ employeeId }),
    Leave.deleteMany({ employeeId }),
    Advance.deleteMany({ employeeId }),
    Bonus.deleteMany({ employeeId }),
    SalaryHistory.deleteMany({ employeeId }),
    PayrollRecord.deleteOne({ employeeId })
  ]);

  console.log("Inserting test Business...");
  await Business.create({
    _id: new mongoose.Types.ObjectId(businessId),
    name: "Hajipur Kitchen",
    ownerId: new mongoose.Types.ObjectId(),
    settings: {
      workingDaysPerMonth: 30,
      payrollCycle: "Monthly",
      timeZone: "Asia/Kolkata",
      maxDeductionPercentage: 50
    }
  });

  console.log("Inserting Overtime Policy...");
  await OvertimePolicy.create({
    businessId: new mongoose.Types.ObjectId(businessId),
    policyName: "Hajipur Kitchen Standard",
    threshold: { dailyHours: 8, weeklyHours: 48 },
    multiplier: 1.5,
    gracePeriodMinutes: 15
  });

  console.log("Inserting test Employee...");
  await Employee.create({
    _id: new mongoose.Types.ObjectId(employeeId),
    businessId: new mongoose.Types.ObjectId(businessId),
    name: "John Doe",
    phoneNumber: "+919999999999",
    role: "Kitchen Staff",
    dates: {
      joiningDate: new Date("2026-06-15T00:00:00.000Z"),
      exitDate: null
    },
    shift: { startTime: "09:00", endTime: "18:00" },
    status: "Active"
  });

  console.log("Inserting test SalaryHistory...");
  await SalaryHistory.create({
    employeeId: new mongoose.Types.ObjectId(employeeId),
    baseAmount: 20000,
    isAdvancedMode: false,
    effectiveFrom: new Date("2026-06-15T00:00:00.000Z"),
    effectiveTo: null
  });

  console.log("Inserting 12 days of Attendance records...");
  const presentDates = [
    "2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19", "2026-06-20",
    "2026-06-22", "2026-06-23", "2026-06-24", "2026-06-25", "2026-06-26", "2026-06-27"
  ];

  for (const d of presentDates) {
    const isOT = d === "2026-06-15"; // Overtime on June 15 (13 hours worked)
    await Attendance.create({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      businessId: new mongoose.Types.ObjectId(businessId),
      date: new Date(d + "T00:00:00.000Z"),
      calculatedHours: isOT ? 13 : 8,
      isLate: false,
      isOvertime: isOT,
      punches: [
        { type: "In", timestamp: new Date(d + "T09:00:00.000Z"), location: { verified: true } },
        { type: "Out", timestamp: new Date(d + (isOT ? "T22:00:00.000Z" : "T17:00:00.000Z")), location: { verified: true } }
      ]
    });
  }

  console.log("Inserting 1 approved unpaid Leave record (June 30)...");
  await Leave.create({
    employeeId: new mongoose.Types.ObjectId(employeeId),
    businessId: new mongoose.Types.ObjectId(businessId),
    startDate: new Date("2026-06-30T00:00:00.000Z"),
    endDate: new Date("2026-06-30T00:00:00.000Z"),
    type: "Unpaid",
    status: "Approved",
    isPaid: false
  });

  console.log("Inserting active Advance (₹5,000 balance, ₹1,000 monthly deduction)...");
  await Advance.create({
    _id: new mongoose.Types.ObjectId("60b8d295f1d2c72b8c9b14a1"),
    employeeId: new mongoose.Types.ObjectId(employeeId),
    businessId: new mongoose.Types.ObjectId(businessId),
    totalAmount: 5000,
    balanceRemaining: 5000,
    deductionPerMonth: 1000,
    status: "Active"
  });

  console.log("Inserting pending Bonus (₹3,000 Festival Bonus)...");
  await Bonus.create({
    _id: new mongoose.Types.ObjectId("60b8d295f1d2c72b8c9b14b1"),
    employeeId: new mongoose.Types.ObjectId(employeeId),
    businessId: new mongoose.Types.ObjectId(businessId),
    title: "Festival Bonus",
    amount: 3000,
    isProcessed: false
  });

  console.log("Mocking Admin JWT token...");
  const token = await signJWT({
    userId: "admin_user_id",
    role: "Admin",
    businessId: businessId
  });

  console.log("Mock JWT Token generated:", token);

  // Call the Next.js API endpoint programmatically (since the server is running on localhost:3000)
  try {
    const response = await fetch("http://localhost:3000/api/v1/payroll/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `token=${token}`
      },
      body: JSON.stringify({
        businessId: businessId,
        payPeriod: { month: 6, year: 2026 },
        employeeIds: [employeeId],
        options: { dryRun: true }
      })
    });

    const result = await response.json();
    console.log("\n--- DRY RUN RESULT ---");
    console.log(JSON.stringify(result, null, 2));

    // Verify properties
    const item = result.payroll?.[0];
    if (item) {
      console.log("\nVerifying math:");
      console.log(`payableDays = ${item.payableDays} (Expected: 14)`);
      console.log(`basicPay = ${item.earnings?.basicPay} (Expected: 9333.33)`);
      console.log(`overtimePay = ${item.earnings?.overtimePay} (Expected: 625)`);
      console.log(`unpaidLeavesAmount = ${item.deductions?.unpaidLeavesAmount} (Expected: 666.67)`);
      console.log(`advanceRecovery = ${item.deductions?.advanceRecovery} (Expected: 1000)`);
      console.log(`netPayable = ${item.netPayable} (Expected: 11291.66)`);
      
      const success = item.payableDays === 14 &&
                      item.earnings?.basicPay === 9333.33 &&
                      item.earnings?.overtimePay === 625 &&
                      item.deductions?.unpaidLeavesAmount === 666.67 &&
                      item.deductions?.advanceRecovery === 1000 &&
                      item.netPayable === 11291.66;
                      
      if (success) {
        console.log("✅ Math checks out perfectly!");
      } else {
        console.log("❌ Math discrepancy found!");
      }
    } else {
      console.log("❌ Failed to calculate payroll!");
    }

    // Now test a real run
    console.log("\nTesting real run (dryRun: false)...");
    const realResponse = await fetch("http://localhost:3000/api/v1/payroll/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `token=${token}`
      },
      body: JSON.stringify({
        businessId: businessId,
        payPeriod: { month: 6, year: 2026 },
        employeeIds: [employeeId],
        options: { dryRun: false }
      })
    });

    const realResult = await realResponse.json();
    console.log("\n--- REAL RUN RESULT ---");
    console.log(JSON.stringify(realResult, null, 2));

    // Check if payroll record is saved in DB
    const savedRecord = await PayrollRecord.findOne({ employeeId, "payPeriod.month": 6 }).lean();
    console.log("\nSaved PayrollRecord in Database:");
    console.log(savedRecord);

    const updatedAdvance = await Advance.findById("60b8d295f1d2c72b8c9b14a1").lean();
    console.log("\nUpdated Advance in Database:");
    console.log(updatedAdvance);

    const updatedBonus = await Bonus.findById("60b8d295f1d2c72b8c9b14b1").lean();
    console.log("\nUpdated Bonus in Database:");
    console.log(updatedBonus);

  } catch (err) {
    console.error("HTTP Fetch failed:", err.message);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
