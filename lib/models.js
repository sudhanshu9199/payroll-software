// lib/models.js
import mongoose from "mongoose";

const { Schema } = mongoose;

// ==========================================
// 1. USER SCHEMA (Shared Auth context)
// ==========================================
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["Admin", "Employee"], default: "Employee" },
    businessId: { type: Schema.Types.ObjectId, ref: "Business" }, // Null if Employee has not joined yet or User is SuperAdmin
  },
  { timestamps: true }
);

// ==========================================
// 2. BUSINESS SCHEMA
// ==========================================
const businessSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    settings: {
      workingDaysPerMonth: { type: Number, default: 30 },
      payrollCycle: { type: String, enum: ["Monthly", "Weekly"], default: "Monthly" },
      timeZone: { type: String, default: "Asia/Kolkata" },
      maxDeductionPercentage: { type: Number, default: 50 }, // Negative net pay ceiling safeguard
    },
  },
  { timestamps: true }
);

// ==========================================
// 3. OVERTIME POLICY SCHEMA
// ==========================================
const overtimePolicySchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    policyName: { type: String, required: true },
    threshold: {
      dailyHours: { type: Number, default: 8 },
      weeklyHours: { type: Number, default: 48 },
    },
    multiplier: { type: Number, default: 1.0 },
    fixedRatePerHour: { type: Number },
    gracePeriodMinutes: { type: Number, default: 15 },
  },
  { timestamps: true }
);

// ==========================================
// 4. EMPLOYEE SCHEMA
// ==========================================
const employeeSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" }, // Links back to unified Auth record
    name: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, unique: true },
    role: { type: String, required: true },
    status: { type: String, enum: ["Active", "Exited"], default: "Active" },

    dates: {
      joiningDate: { type: Date, required: true },
      exitDate: { type: Date, default: null },
      exitReason: {
        type: String,
        enum: ["Resignation", "Termination", "Contract End", "Personal", "Other", ""],
        default: "",
      },
      exitNotes: { type: String, default: "" },
    },

    shift: {
      startTime: { type: String, default: "09:00" },
      endTime: { type: String, default: "18:00" },
    },

    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      upiId: String,
    },

    geofence: {
      latitude: Number,
      longitude: Number,
      radiusMeters: { type: Number, default: 50 },
    },
    leaveBalances: {
      sick: { type: Number, default: 5 },
      casual: { type: Number, default: 6 },
    },
    aadhaar: { type: String, trim: true },
    pan: { type: String, trim: true },

    email: { type: String, trim: true },
    department: { type: String, default: "General" },
    documents: {
      resumeUrl: { type: String, default: "" },
      appointmentLetterUrl: { type: String, default: "" },
      idProofUrl: { type: String, default: "" },
      otherDocs: [
        {
          title: { type: String, required: true },
          fileUrl: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
    },
    emergencyContact: {
      name: { type: String, default: "" },
      relationship: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Add index on businessId + status for fast active list fetch
employeeSchema.index({ businessId: 1, status: 1 });

// ==========================================
// 5. SALARY HISTORY SCHEMA (Append-Only)
// ==========================================
const salaryHistorySchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    baseAmount: { type: Number, required: true },
    isAdvancedMode: { type: Boolean, default: false },
    components: [
      {
        name: String,
        type: { type: String, enum: ["Earning", "Deduction"] },
        amount: Number,
      },
    ],
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null }, // Null marks active salary
  },
  { timestamps: true }
);

salaryHistorySchema.index({ employeeId: 1, effectiveFrom: 1, effectiveTo: 1 });
salaryHistorySchema.index({ employeeId: 1, effectiveTo: 1 });

// ==========================================
// 6. ATTENDANCE SCHEMA
// ==========================================
const attendanceSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    date: { type: Date, required: true },

    punches: [
      {
        type: { type: String, enum: ["In", "Out"] },
        timestamp: { type: Date, required: true },
        location: {
          latitude: Number,
          longitude: Number,
          verified: Boolean,
        },
      },
    ],

    calculatedHours: { type: Number, default: 0 },
    isLate: { type: Boolean, default: false },
    isOvertime: { type: Boolean, default: false },

    override: {
      isManual: { type: Boolean, default: false },
      modifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
      reason: String,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ businessId: 1, employeeId: 1, date: 1 });
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ businessId: 1, date: 1 });

// ==========================================
// 7. LEAVE SCHEMA
// ==========================================
const leaveSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: { type: String, enum: ["Sick", "Casual", "Unpaid"], required: true },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    isPaid: { type: Boolean, default: false },
    reason: { type: String, trim: true },
  },
  { timestamps: true }
);

leaveSchema.index({ businessId: 1, employeeId: 1, startDate: 1 });
leaveSchema.index({ businessId: 1, status: 1, startDate: -1 });

// ==========================================
// 8. ADVANCE & BONUS SCHEMAS
// ==========================================
const advanceSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    totalAmount: { type: Number, required: true },
    balanceRemaining: { type: Number, required: true },
    deductionPerMonth: { type: Number, required: true },
    status: { type: String, enum: ["Active", "Recovered"], default: "Active" },
  },
  { timestamps: true }
);

advanceSchema.index({ employeeId: 1, status: 1 });
advanceSchema.index({ businessId: 1, status: 1 });

const bonusSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    dateAwarded: { type: Date, default: Date.now },
    isProcessed: { type: Boolean, default: false },
    payrollRecordId: { type: Schema.Types.ObjectId, ref: "PayrollRecord" },
  },
  { timestamps: true }
);

// ==========================================
// 9. PAYROLL RECORD SCHEMA
// ==========================================
const payrollRecordSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    payPeriod: {
      month: { type: Number, required: true },
      year: { type: Number, required: true },
    },

    // Frozen Snapshots
    salarySnapshot: { type: Schema.Types.Mixed, required: true },
    aggregatedData: {
      totalPresentDays: Number,
      totalAbsentDays: Number,
      unpaidLeaves: Number,
      overtimeHours: Number,
    },

    netPay: { type: Number, required: true },
    status: { type: String, enum: ["Generated", "Paid"], default: "Generated" },
    paymentMethod: { type: String, enum: ["Bank", "Cash", "UPI", "Pending"], default: "Pending" },
    payslipUrl: { type: String },
    isFnF: { type: Boolean, default: false },
    proratedDays: { type: Number },
  },
  { timestamps: true }
);

payrollRecordSchema.index(
  { businessId: 1, employeeId: 1, "payPeriod.year": 1, "payPeriod.month": 1 },
  { unique: true }
);

// Prevent compilation errors in Next.js development (re-compilation safety)
if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.Employee;
  delete mongoose.models.Leave;
}

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Business = mongoose.models.Business || mongoose.model("Business", businessSchema);
export const OvertimePolicy =
  mongoose.models.OvertimePolicy || mongoose.model("OvertimePolicy", overtimePolicySchema);
export const Employee = mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
export const SalaryHistory =
  mongoose.models.SalaryHistory || mongoose.model("SalaryHistory", salaryHistorySchema);
export const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
export const Leave = mongoose.models.Leave || mongoose.model("Leave", leaveSchema);
export const Advance = mongoose.models.Advance || mongoose.model("Advance", advanceSchema);
export const Bonus = mongoose.models.Bonus || mongoose.model("Bonus", bonusSchema);
export const PayrollRecord =
  mongoose.models.PayrollRecord || mongoose.model("PayrollRecord", payrollRecordSchema);
