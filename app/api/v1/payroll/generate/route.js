// app/api/v1/payroll/generate/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import {
  Employee,
  Attendance,
  Leave,
  Advance,
  Bonus,
  PayrollRecord,
  OvertimePolicy,
  SalaryHistory,
  Business
} from "@/lib/models";
import { verifyJWT } from "@/lib/auth";
import { getPayslipQueue, getPayrollQueue } from "@/lib/queue";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = "Asia/Kolkata";

export async function POST(request) {
  try {
    // 1. Session Authentication
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session missing." }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || session.role !== "Admin" || !session.businessId) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { businessId, payPeriod, employeeIds, options } = body;
    const dryRun = options?.dryRun !== false; // defaults to true

    if (!businessId || !payPeriod || !payPeriod.month || !payPeriod.year) {
      return NextResponse.json({ error: "businessId and payPeriod (month, year) are required." }, { status: 400 });
    }

    // Ensure businessId matches session
    if (businessId !== session.businessId) {
      return NextResponse.json({ error: "Unauthorized for this business." }, { status: 403 });
    }

    await dbConnect();

    // 3. Fetch Settings
    const business = await Business.findById(businessId).lean();
    if (!business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }
    const workingDaysPerMonth = business.settings?.workingDaysPerMonth ?? 30;
    const maxDeductionPercentage = business.settings?.maxDeductionPercentage ?? 50;

    const policy = await OvertimePolicy.findOne({ businessId }).lean();
    const dailyThreshold = policy?.threshold?.dailyHours ?? 8;

    // 4. Fetch Employees
    const year = parseInt(payPeriod.year);
    const month = parseInt(payPeriod.month);
    const monthStart = dayjs().tz(TIMEZONE).year(year).month(month - 1).startOf("month");
    const monthEnd = dayjs().tz(TIMEZONE).year(year).month(month - 1).endOf("month");
    const daysInMonth = monthEnd.date();

    let employeeQuery = { businessId };
    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      employeeQuery._id = { $in: employeeIds.map(id => new mongoose.Types.ObjectId(id)) };
    } else {
      // Fetch active employees or those who exited in this month
      employeeQuery.$or = [
        { status: "Active" },
        {
          status: "Exited",
          "dates.exitDate": { $gte: monthStart.toDate(), $lte: monthEnd.toDate() }
        }
      ];
    }

    const employees = await Employee.find(employeeQuery).lean();
    const payrollOutputs = [];

    // Helper function to find active salary for a given day
    function findSalaryForDay(day, salaryHistories) {
      for (const sh of salaryHistories) {
        const from = dayjs(sh.effectiveFrom).tz(TIMEZONE).startOf("day");
        const to = sh.effectiveTo ? dayjs(sh.effectiveTo).tz(TIMEZONE).endOf("day") : null;
        if ((day.isSame(from) || day.isAfter(from)) && (!to || day.isSame(to) || day.isBefore(to))) {
          return sh;
        }
      }
      return salaryHistories[salaryHistories.length - 1] || null;
    }

    // Process each employee
    for (const emp of employees) {
      const empId = emp._id;
      const joiningDate = dayjs(emp.dates.joiningDate).tz(TIMEZONE).startOf("day");
      const exitDate = emp.dates.exitDate ? dayjs(emp.dates.exitDate).tz(TIMEZONE).endOf("day") : null;

      // Skip if employee wasn't employed during this month
      if (joiningDate.isAfter(monthEnd) || (exitDate && exitDate.isBefore(monthStart))) {
        continue;
      }

      // Determine active range within this month
      const activeStart = joiningDate.isAfter(monthStart) ? joiningDate : monthStart;
      const activeEnd = exitDate && exitDate.isBefore(monthEnd) ? exitDate : monthEnd;
      const activeDays = activeEnd.diff(activeStart, "day") + 1;

      // Concurrently query database for this employee
      const [attendances, leaves, activeAdvances, pendingBonuses, salaryHistories] = await Promise.all([
        Attendance.find({ employeeId: empId, date: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() } }).lean(),
        Leave.find({ employeeId: empId, status: "Approved", startDate: { $lte: monthEnd.toDate() }, endDate: { $gte: monthStart.toDate() } }).lean(),
        Advance.find({ employeeId: empId, status: "Active", businessId }).lean(),
        Bonus.find({ employeeId: empId, isProcessed: false, businessId }).lean(),
        SalaryHistory.find({ employeeId: empId }).sort({ effectiveFrom: 1 }).lean()
      ]);

      if (salaryHistories.length === 0) {
        console.warn(`No salary history found for employee ${empId}. Skipping.`);
        continue;
      }

      let totalPresentDays = 0;
      let unpaidLeavesCount = 0;
      let totalAbsentDays = 0;
      let totalOvertimeHours = 0;

      let basicPay = 0;
      let allowances = 0;
      let unpaidLeavesAmount = 0;
      let overtimePay = 0;

      // Track components dynamically for detailed breakdown
      const calculatedComponents = {};

      // Day-by-day evaluation
      let currentDay = activeStart.clone();
      while (currentDay.isSame(activeEnd) || currentDay.isBefore(activeEnd)) {
        // Find salary record for this day
        const salaryRecord = findSalaryForDay(currentDay, salaryHistories);
        if (!salaryRecord) {
          currentDay = currentDay.add(1, "day");
          continue;
        }

        const baseAmount = salaryRecord.baseAmount || 0;
        const dailyBaseRate = baseAmount / daysInMonth;

        // Accumulate full contracted earnings day-by-day
        if (salaryRecord.isAdvancedMode && salaryRecord.components) {
          salaryRecord.components.forEach(c => {
            if (c.type === "Earning") {
              const isBasic = c.name.toLowerCase().includes("basic");
              const dailyVal = (c.amount || 0) / daysInMonth;
              if (isBasic) {
                basicPay += dailyVal;
              } else {
                allowances += dailyVal;
              }
              calculatedComponents[c.name] = (calculatedComponents[c.name] || 0) + dailyVal;
            }
          });
        } else {
          basicPay += dailyBaseRate;
        }

        // Check attendance
        const att = attendances.find(a => dayjs(a.date).tz(TIMEZONE).isSame(currentDay, "day"));
        if (att) {
          totalPresentDays++;
          // Overtime calculation
          const otHours = Math.max(0, (att.calculatedHours || 0) - dailyThreshold);
          totalOvertimeHours += otHours;

          const multiplier = policy?.multiplier ?? 1.5;
          const fixedRate = policy?.fixedRatePerHour;
          let dailyOtPay = 0;
          if (fixedRate !== undefined && fixedRate !== null) {
            dailyOtPay = otHours * fixedRate;
          } else {
            const hourlyRate = dailyBaseRate / 8;
            dailyOtPay = otHours * hourlyRate * multiplier;
          }
          overtimePay += dailyOtPay;
        } else {
          // Check approved leaves
          const leave = leaves.find(l => {
            const start = dayjs(l.startDate).tz(TIMEZONE).startOf("day");
            const end = dayjs(l.endDate).tz(TIMEZONE).endOf("day");
            return (currentDay.isSame(start) || currentDay.isAfter(start)) && (currentDay.isSame(end) || currentDay.isBefore(end));
          });

          if (leave) {
            if (leave.isPaid === false || leave.type === "Unpaid") {
              unpaidLeavesCount++;
              unpaidLeavesAmount += dailyBaseRate;
            }
          } else {
            // No attendance, no leave
            const isSunday = currentDay.day() === 0;
            if (!isSunday) {
              // Absent
              totalAbsentDays++;
              unpaidLeavesAmount += dailyBaseRate;
            }
          }
        }

        currentDay = currentDay.add(1, "day");
      }

      // Calculate basePayableDays and payableDays
      let basePayableDays = activeDays;
      if (activeDays >= daysInMonth) {
        basePayableDays = daysInMonth;
      }
      const payableDays = Math.max(0, basePayableDays - unpaidLeavesCount - totalAbsentDays);

      // Round calculations
      basicPay = parseFloat(basicPay.toFixed(2));
      allowances = parseFloat(allowances.toFixed(2));
      unpaidLeavesAmount = parseFloat(unpaidLeavesAmount.toFixed(2));
      overtimePay = parseFloat(overtimePay.toFixed(2));

      // Calculate bonuses
      const bonusesList = pendingBonuses.map(b => ({
        bonusId: b._id.toString(),
        amount: b.amount,
        title: b.title
      }));
      const totalBonusAmount = pendingBonuses.reduce((sum, b) => sum + b.amount, 0);

      // Calculate other salary deductions from components (if any, e.g., PF, ESIC, PT)
      const otherDeductions = {};
      let totalOtherDeductions = 0;

      // Deductions calculated day-by-day based on active salary record
      currentDay = activeStart.clone();
      while (currentDay.isSame(activeEnd) || currentDay.isBefore(activeEnd)) {
        const salaryRecord = findSalaryForDay(currentDay, salaryHistories);
        if (salaryRecord && salaryRecord.isAdvancedMode && salaryRecord.components) {
          // Check if employee is eligible for pay on this day (Present, Sunday, or Paid Leave)
          const isEligible = attendances.some(a => dayjs(a.date).tz(TIMEZONE).isSame(currentDay, "day")) ||
                             leaves.some(l => {
                               const start = dayjs(l.startDate).tz(TIMEZONE).startOf("day");
                               const end = dayjs(l.endDate).tz(TIMEZONE).endOf("day");
                               return (currentDay.isSame(start) || currentDay.isAfter(start)) &&
                                      (currentDay.isSame(end) || currentDay.isBefore(end)) &&
                                      l.isPaid !== false && l.type !== "Unpaid";
                             }) ||
                             currentDay.day() === 0;

          if (isEligible) {
            salaryRecord.components.forEach(c => {
              if (c.type === "Deduction") {
                const dailyVal = (c.amount || 0) / daysInMonth;
                otherDeductions[c.name] = (otherDeductions[c.name] || 0) + dailyVal;
                totalOtherDeductions += dailyVal;
              }
            });
          }
        }
        currentDay = currentDay.add(1, "day");
      }

      // Round other deductions
      totalOtherDeductions = parseFloat(totalOtherDeductions.toFixed(2));
      Object.keys(otherDeductions).forEach(name => {
        otherDeductions[name] = parseFloat(otherDeductions[name].toFixed(2));
      });

      // Calculate total earnings
      const totalEarnings = basicPay + allowances + overtimePay + totalBonusAmount;

      // Phase 2: The Deduction Waterfall
      // 1. Statutory Obligations & Capping
      // Statutory max deduction is a percentage of GROSS, ensuring minimum take-home pay
      const absoluteMaxDeduction = totalEarnings * (maxDeductionPercentage / 100); 
      
      // 2. Deduction Priority: Taxes -> Unpaid Leaves/PF/ESIC -> Private Advances
      const statutoryAndLeaveDeductions = totalOtherDeductions + unpaidLeavesAmount;
      
      // 3. Calculate remaining safe buffer for advance recovery
      const maxAdvanceRecoveryAllowed = Math.max(0, absoluteMaxDeduction - statutoryAndLeaveDeductions);

      let totalAdvanceRecovery = 0;
      const recoveriesList = [];

      for (const adv of activeAdvances) {
        const tentativeRecovery = Math.min(adv.deductionPerMonth, adv.balanceRemaining);
        if (totalAdvanceRecovery + tentativeRecovery > maxAdvanceRecoveryAllowed) {
          const actualRecovery = maxAdvanceRecoveryAllowed - totalAdvanceRecovery;
          if (actualRecovery > 0) {
            totalAdvanceRecovery += actualRecovery;
            recoveriesList.push({
              advanceId: adv._id,
              amount: parseFloat(actualRecovery.toFixed(2)),
              remainingBefore: adv.balanceRemaining
            });
          }
          break; // Hit the compliance ceiling, defer remaining advance to next month
        } else {
          totalAdvanceRecovery += tentativeRecovery;
          recoveriesList.push({
            advanceId: adv._id,
            amount: parseFloat(tentativeRecovery.toFixed(2)),
            remainingBefore: adv.balanceRemaining
          });
        }
      }

      totalAdvanceRecovery = parseFloat(totalAdvanceRecovery.toFixed(2));

      // Calculate final Net Payable
      const netPayable = parseFloat((totalEarnings - statutoryAndLeaveDeductions - totalAdvanceRecovery).toFixed(2));

      // Prepare payload
      const output = {
        employeeId: empId.toString(),
        name: emp.name,
        payPeriod: { month, year },
        payableDays,
        earnings: {
          basicPay,
          allowances,
          overtimePay,
          bonuses: bonusesList
        },
        deductions: {
          unpaidLeavesAmount,
          advanceRecovery: totalAdvanceRecovery,
          taxes: 0,
          ...otherDeductions
        },
        netPayable,
        status: dryRun ? "Draft" : "Queued",
        // Internal details for non-dryRun updates
        _recoveries: recoveriesList,
        _bonuses: pendingBonuses.map(b => b._id),
        _salarySnapshot: {
          baseAmount: salaryHistories[salaryHistories.length - 1].baseAmount,
          isAdvancedMode: salaryHistories[salaryHistories.length - 1].isAdvancedMode,
          components: salaryHistories[salaryHistories.length - 1].components
        },
        _aggregatedData: {
          totalPresentDays,
          totalAbsentDays,
          unpaidLeaves: unpaidLeavesCount,
          overtimeHours: totalOvertimeHours
        }
      };

      payrollOutputs.push(output);
    }

    // Phase 3: Background Worker Offloading
    if (!dryRun) {
      const queue = getPayrollQueue(); 
      const job = await queue.add(`process-payroll-${businessId}-${month}-${year}`, {
        businessId,
        month,
        year,
        payrollOutputs
      }, { removeOnComplete: true });

      return NextResponse.json({ 
        success: true, 
        message: "Payroll processing queued successfully.", 
        jobId: job.id 
      }, { status: 202 });
    }

    // Clean internal properties before returning response (dryRun)
    const cleanOutputs = payrollOutputs.map(out => {
      const { _recoveries, _bonuses, _salarySnapshot, _aggregatedData, ...clean } = out;
      return clean;
    });

    return NextResponse.json({ success: true, payroll: cleanOutputs }, { status: 200 });
  } catch (error) {
    console.error("[POST Generate Payroll] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate payroll." }, { status: 500 });
  }
}
