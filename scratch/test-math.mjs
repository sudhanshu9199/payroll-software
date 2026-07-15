import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = "Asia/Kolkata";

// Mock Input Data matching June 2026 example
const baseSalary = 20000;
const workingDaysPerMonth = 30;
const maxDeductionPercentage = 50;

const dailyThreshold = 8;
const overtimeMultiplier = 1.5;
const overtimeFixedRate = null;

const joiningDate = dayjs("2026-06-15T00:00:00.000Z").tz(TIMEZONE).startOf("day");
const exitDate = null;

const monthStart = dayjs("2026-06-01T00:00:00.000Z").tz(TIMEZONE).startOf("day");
const monthEnd = dayjs("2026-06-30T00:00:00.000Z").tz(TIMEZONE).endOf("day");
const daysInMonth = monthEnd.date();

const activeStart = joiningDate.isAfter(monthStart) ? joiningDate : monthStart;
const activeEnd = exitDate && exitDate.isBefore(monthEnd) ? exitDate : monthEnd;
const activeDays = activeEnd.diff(activeStart, "day") + 1;

// Attendance mock (12 days present)
const presentDates = [
  "2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19", "2026-06-20",
  "2026-06-22", "2026-06-23", "2026-06-24", "2026-06-25", "2026-06-26", "2026-06-27"
];
const mockAttendances = presentDates.map(d => ({
  date: new Date(d + "T00:00:00.000Z"),
  calculatedHours: d === "2026-06-15" ? 13 : 8,
  isOvertime: d === "2026-06-15"
}));

// Leaves mock (1 approved unpaid leave on June 30)
const mockLeaves = [
  {
    startDate: new Date("2026-06-30T00:00:00.000Z"),
    endDate: new Date("2026-06-30T00:00:00.000Z"),
    type: "Unpaid",
    isPaid: false
  }
];

// Advances mock (1 active advance: ₹5,000 balance, ₹1,000 monthly deduction)
const mockAdvances = [
  {
    _id: "60b8d295f1d2c72b8c9b14a1",
    totalAmount: 5000,
    balanceRemaining: 5000,
    deductionPerMonth: 1000,
    status: "Active"
  }
];

// Bonuses mock (1 pending bonus: ₹3,000 Festival Bonus)
const mockBonuses = [
  {
    _id: "60b8d295f1d2c72b8c9b14b1",
    title: "Festival Bonus",
    amount: 3000,
    isProcessed: false
  }
];

// Salary History mock
const mockSalaryHistories = [
  {
    baseAmount: 20000,
    isAdvancedMode: false,
    effectiveFrom: new Date("2026-06-15T00:00:00.000Z"),
    effectiveTo: null
  }
];

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

// ENGINE EXECUTION (identical to route.js)
let totalPresentDays = 0;
let unpaidLeavesCount = 0;
let totalAbsentDays = 0;
let totalOvertimeHours = 0;

let basicPay = 0;
let allowances = 0;
let unpaidLeavesAmount = 0;
let overtimePay = 0;

const calculatedComponents = {};

let currentDay = activeStart.clone();
while (currentDay.isSame(activeEnd) || currentDay.isBefore(activeEnd)) {
  const salaryRecord = findSalaryForDay(currentDay, mockSalaryHistories);
  if (!salaryRecord) {
    currentDay = currentDay.add(1, "day");
    continue;
  }

  const baseAmountVal = salaryRecord.baseAmount || 0;
  const dailyBaseRate = baseAmountVal / workingDaysPerMonth;

  // Check attendance
  const att = mockAttendances.find(a => dayjs(a.date).tz(TIMEZONE).isSame(currentDay, "day"));
  if (att) {
    totalPresentDays++;
    const otHours = Math.max(0, (att.calculatedHours || 0) - dailyThreshold);
    totalOvertimeHours += otHours;

    const multiplier = overtimeMultiplier;
    const fixedRate = overtimeFixedRate;
    let dailyOtPay = 0;
    if (fixedRate !== undefined && fixedRate !== null) {
      dailyOtPay = otHours * fixedRate;
    } else {
      const hourlyRate = dailyBaseRate / 8;
      dailyOtPay = otHours * hourlyRate * multiplier;
    }
    overtimePay += dailyOtPay;

    if (salaryRecord.isAdvancedMode && salaryRecord.components) {
      salaryRecord.components.forEach(c => {
        if (c.type === "Earning") {
          const isBasic = c.name.toLowerCase().includes("basic");
          const dailyVal = (c.amount || 0) / workingDaysPerMonth;
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
  } else {
    // Check leaves
    const leave = mockLeaves.find(l => {
      const start = dayjs(l.startDate).tz(TIMEZONE).startOf("day");
      const end = dayjs(l.endDate).tz(TIMEZONE).endOf("day");
      return (currentDay.isSame(start) || currentDay.isAfter(start)) && (currentDay.isSame(end) || currentDay.isBefore(end));
    });

    if (leave) {
      if (leave.isPaid === false || leave.type === "Unpaid") {
        unpaidLeavesCount++;
        unpaidLeavesAmount += dailyBaseRate;
      }
      if (leave.isPaid !== false && leave.type !== "Unpaid") {
        if (salaryRecord.isAdvancedMode && salaryRecord.components) {
          salaryRecord.components.forEach(c => {
            if (c.type === "Earning") {
              const isBasic = c.name.toLowerCase().includes("basic");
              const dailyVal = (c.amount || 0) / workingDaysPerMonth;
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
      }
    } else {
      const isSunday = currentDay.day() === 0;
      if (isSunday) {
        if (salaryRecord.isAdvancedMode && salaryRecord.components) {
          salaryRecord.components.forEach(c => {
            if (c.type === "Earning") {
              const isBasic = c.name.toLowerCase().includes("basic");
              const dailyVal = (c.amount || 0) / workingDaysPerMonth;
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
      } else {
        totalAbsentDays++;
      }
    }
  }

  currentDay = currentDay.add(1, "day");
}

let basePayableDays = activeDays;
if (activeDays >= daysInMonth) {
  basePayableDays = workingDaysPerMonth;
}
const payableDays = Math.max(0, basePayableDays - unpaidLeavesCount - totalAbsentDays);

basicPay = parseFloat(basicPay.toFixed(2));
allowances = parseFloat(allowances.toFixed(2));
unpaidLeavesAmount = parseFloat(unpaidLeavesAmount.toFixed(2));
overtimePay = parseFloat(overtimePay.toFixed(2));

const totalBonusAmount = mockBonuses.reduce((sum, b) => sum + b.amount, 0);
const totalEarnings = basicPay + allowances + overtimePay + totalBonusAmount;

const maxDeductionAllowed = totalEarnings * (maxDeductionPercentage / 100);
const maxAdvanceRecoveryAllowed = Math.max(0, maxDeductionAllowed - unpaidLeavesAmount);

let totalAdvanceRecovery = 0;
for (const adv of mockAdvances) {
  const tentativeRecovery = Math.min(adv.deductionPerMonth, adv.balanceRemaining);
  if (totalAdvanceRecovery + tentativeRecovery > maxAdvanceRecoveryAllowed) {
    const actualRecovery = maxAdvanceRecoveryAllowed - totalAdvanceRecovery;
    if (actualRecovery > 0) {
      totalAdvanceRecovery += actualRecovery;
    }
    break;
  } else {
    totalAdvanceRecovery += tentativeRecovery;
  }
}

totalAdvanceRecovery = parseFloat(totalAdvanceRecovery.toFixed(2));
const netPayable = parseFloat((totalEarnings - unpaidLeavesAmount - totalAdvanceRecovery).toFixed(2));

console.log("\n--- ENGINE MATH TEST OUTPUT ---");
console.log(`payableDays = ${payableDays} (Expected: 14)`);
console.log(`basicPay = ${basicPay} (Expected: 9333.33)`);
console.log(`overtimePay = ${overtimePay} (Expected: 625)`);
console.log(`unpaidLeavesAmount = ${unpaidLeavesAmount} (Expected: 666.67)`);
console.log(`advanceRecovery = ${totalAdvanceRecovery} (Expected: 1000)`);
console.log(`netPayable = ${netPayable} (Expected: 11291.66)`);

const success = payableDays === 14 &&
                basicPay === 9333.33 &&
                overtimePay === 625 &&
                unpaidLeavesAmount === 666.67 &&
                totalAdvanceRecovery === 1000 &&
                netPayable === 11291.66;

if (success) {
  console.log("\n✅ ENGINE CALCULATIONS VERIFIED SUCCESSFULLY!");
} else {
  console.log("\n❌ ENGINE CALCULATIONS MISMATCH!");
  process.exit(1);
}
