import mongoose from "mongoose";
import { POST } from "../app/api/v1/payroll/generate/route.js";
import {
  Business,
  Employee,
  Attendance,
  Leave,
  Advance,
  Bonus,
  SalaryHistory,
  PayrollRecord,
  OvertimePolicy
} from "../lib/models.js";
import { signJWT } from "../lib/auth.js";

const businessId = "60b8d295f1d2c72b8c9b14f1";
const employeeId = "60b8d295f1d2c72b8c9b14f2";

// Mock environment
process.env.JWT_SECRET = "8e68cfb99c75a40b9db8d781b0a8807d9f78310c2c31e42fb56d819db0f56a5c";

// 1. Mock database queries on mongoose models
mongoose.connect = () => Promise.resolve({ connection: { name: "mock-db" } });
mongoose.startSession = () => Promise.resolve({
  startTransaction: () => {},
  commitTransaction: () => {},
  abortTransaction: () => {},
  endSession: () => {}
});

Business.findById = () => ({
  lean: () => Promise.resolve({
    _id: new mongoose.Types.ObjectId(businessId),
    name: "Hajipur Kitchen",
    settings: {
      workingDaysPerMonth: 30,
      payrollCycle: "Monthly",
      timeZone: "Asia/Kolkata",
      maxDeductionPercentage: 50
    }
  })
});

OvertimePolicy.findOne = () => ({
  lean: () => Promise.resolve({
    businessId: new mongoose.Types.ObjectId(businessId),
    policyName: "Hajipur Kitchen Standard",
    threshold: { dailyHours: 8 },
    multiplier: 1.5,
    gracePeriodMinutes: 15
  })
});

Employee.find = () => ({
  lean: () => Promise.resolve([
    {
      _id: new mongoose.Types.ObjectId(employeeId),
      businessId: new mongoose.Types.ObjectId(businessId),
      name: "John Doe",
      dates: {
        joiningDate: new Date("2026-06-15T00:00:00.000Z"),
        exitDate: null
      },
      shift: { startTime: "09:00", endTime: "18:00" },
      status: "Active"
    }
  ])
});

// 12 days present: June 15 to 20, June 22 to 27
const presentDates = [
  "2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19", "2026-06-20",
  "2026-06-22", "2026-06-23", "2026-06-24", "2026-06-25", "2026-06-26", "2026-06-27"
];
const mockAttendances = presentDates.map(d => ({
  employeeId: new mongoose.Types.ObjectId(employeeId),
  businessId: new mongoose.Types.ObjectId(businessId),
  date: new Date(d + "T00:00:00.000Z"),
  calculatedHours: d === "2026-06-15" ? 13 : 8,
  isLate: false,
  isOvertime: d === "2026-06-15"
}));

Attendance.find = () => ({
  lean: () => Promise.resolve(mockAttendances)
});

Leave.find = () => ({
  lean: () => Promise.resolve([
    {
      employeeId: new mongoose.Types.ObjectId(employeeId),
      businessId: new mongoose.Types.ObjectId(businessId),
      startDate: new Date("2026-06-30T00:00:00.000Z"),
      endDate: new Date("2026-06-30T00:00:00.000Z"),
      type: "Unpaid",
      status: "Approved",
      isPaid: false
    }
  ])
});

Advance.find = () => ({
  lean: () => Promise.resolve([
    {
      _id: new mongoose.Types.ObjectId("60b8d295f1d2c72b8c9b14a1"),
      employeeId: new mongoose.Types.ObjectId(employeeId),
      businessId: new mongoose.Types.ObjectId(businessId),
      totalAmount: 5000,
      balanceRemaining: 5000,
      deductionPerMonth: 1000,
      status: "Active"
    }
  ])
});

Bonus.find = () => ({
  lean: () => Promise.resolve([
    {
      _id: new mongoose.Types.ObjectId("60b8d295f1d2c72b8c9b14b1"),
      employeeId: new mongoose.Types.ObjectId(employeeId),
      businessId: new mongoose.Types.ObjectId(businessId),
      title: "Festival Bonus",
      amount: 3000,
      isProcessed: false
    }
  ])
});

SalaryHistory.find = () => ({
  sort: () => ({
    lean: () => Promise.resolve([
      {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        baseAmount: 20000,
        isAdvancedMode: false,
        effectiveFrom: new Date("2026-06-15T00:00:00.000Z"),
        effectiveTo: null
      }
    ])
  })
});

async function run() {
  console.log("Mocking Admin JWT token...");
  const token = await signJWT({
    userId: "admin_user_id",
    role: "Admin",
    businessId: businessId
  });

  console.log("Mock JWT Token generated:", token);

  // Construct Next.js request mock
  const req = new Request("http://localhost:3000/api/v1/payroll/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      businessId: businessId,
      payPeriod: { month: 6, year: 2026 },
      employeeIds: [employeeId],
      options: { dryRun: true }
    })
  });

  req.cookies = {
    get: (name) => {
      if (name === "token") return { value: token };
      return null;
    }
  };

  console.log("Invoking POST /api/v1/payroll/generate handler...");
  const res = await POST(req);
  const result = await res.json();

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
      console.log("\n✅ ALL CALCULATIONS MATCH CONTRACT EXPECTATIONS PERFECTLY!");
    } else {
      console.log("\n❌ Math discrepancy found!");
      process.exit(1);
    }
  } else {
    console.log("❌ Failed to calculate payroll!");
    process.exit(1);
  }
}

run().catch(console.error);
