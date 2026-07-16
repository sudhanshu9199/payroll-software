import fs from "fs";
import path from "path";
import { Worker } from "bullmq";
import Redis from "ioredis";
import mongoose from "mongoose";
import puppeteer from "puppeteer";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { fileURLToPath } from "url";

// Setup Dayjs timezone support
dayjs.extend(utc);
dayjs.extend(timezone);
const TIMEZONE = "Asia/Kolkata";

// 1. Manually parse .env.local to load environment variables for standalone execution
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
  console.log("⚙️ Environment variables loaded from .env.local");
} catch (e) {
  console.log("⚠️ No .env.local found or error reading it:", e.message);
}

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// 2. Initialize Database and Models
const { default: dbConnect } = await import("./lib/db.js");
const { PayrollRecord, Employee, Business } = await import("./lib/models.js");

// Create public/payslips directory for local fallback storage
const payslipsDir = path.join(process.cwd(), "public", "payslips");
if (!fs.existsSync(payslipsDir)) {
  fs.mkdirSync(payslipsDir, { recursive: true });
}

// 3. Optional AWS S3 integration via dynamic import
let s3Client = null;
let s3Bucket = process.env.AWS_S3_BUCKET;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && s3Bucket) {
  try {
    const { S3Client } = await import("@aws-sdk/client-s3");
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "ap-south-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    console.log("📦 AWS S3 Integration configured.");
  } catch (err) {
    console.warn("⚠️ AWS S3 SDK not available or failed to load. Falling back to local storage.", err.message);
  }
}

// Determine if this script is being run directly as a daemon
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]);

if (isMain) {
  console.log("🔌 Connecting to MongoDB...");
  await dbConnect();
  console.log("✅ MongoDB Connected.");

  // 4. Initialize BullMQ Worker
  const connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  connection.on("error", (err) => {
    console.error("Redis Connection Error (Worker):", err);
  });

  console.log("🚀 Starting BullMQ worker for 'payslip-generation'...");

  const worker = new Worker(
    "payslip-generation",
    async (job) => {
      const { payrollRecordId, employeeId, businessId, month, year } = job.data;
      console.log(`\n📥 [Job ${job.id}] Processing payslip for Record ID: ${payrollRecordId}`);

      // Fetch Database Records
      const record = await PayrollRecord.findById(payrollRecordId).lean();
      if (!record) throw new Error(`PayrollRecord ${payrollRecordId} not found.`);

      const employee = await Employee.findById(employeeId).lean();
      if (!employee) throw new Error(`Employee ${employeeId} not found.`);

      const business = await Business.findById(businessId).lean();
      if (!business) throw new Error(`Business ${businessId} not found.`);

      // Generate HTML string for rendering
      const htmlContent = generatePayslipHtml({
        business,
        employee,
        record,
        month,
        year,
      });

      // Launch headless Puppeteer instance
      console.log(`🖥️ [Job ${job.id}] Launching Puppeteer...`);
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });
        
        const pdfFileName = `payslip-${payrollRecordId}.pdf`;
        const localPdfPath = path.join(payslipsDir, pdfFileName);

        console.log(`📄 [Job ${job.id}] Rendering PDF layout...`);
        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: {
            top: "15mm",
            right: "15mm",
            bottom: "15mm",
            left: "15mm",
          },
        });

        let payslipUrl = "";

        // Write to S3 if configured, else write to local Next.js public directory
        if (s3Client) {
          console.log(`📤 [Job ${job.id}] Uploading to AWS S3...`);
          const { PutObjectCommand } = await import("@aws-sdk/client-s3");
          const s3Key = `payslips/${year}/${month}/${pdfFileName}`;
          
          await s3Client.send(
            new PutObjectCommand({
              Bucket: s3Bucket,
              Key: s3Key,
              Body: pdfBuffer,
              ContentType: "application/pdf",
            })
          );
          payslipUrl = `https://${s3Bucket}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${s3Key}`;
        } else {
          console.log(`💾 [Job ${job.id}] Saving locally to: ${localPdfPath}`);
          fs.writeFileSync(localPdfPath, pdfBuffer);
          payslipUrl = `/payslips/${pdfFileName}`;
        }

        // Update PayrollRecord in DB
        await PayrollRecord.updateOne(
          { _id: payrollRecordId },
          { $set: { payslipUrl } }
        );
        console.log(`💾 [Job ${job.id}] Saved payslipUrl: ${payslipUrl}`);

        // Dispatch mock notification ping
        sendMockNotification(employee, record, month, year, payslipUrl);

      } finally {
        await browser.close();
      }
    },
    { connection }
  );

  worker.on("completed", (job) => {
    console.log(`✅ [Job ${job.id}] Completed successfully.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ [Job ${job?.id}] Failed:`, err.message);
  });
}

// Helper function to format INR currency
export function formatINR(val) {
  return typeof val === "number"
    ? `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "₹0.00";
}

// Generate premium payslip HTML layout
export function generatePayslipHtml({ business, employee, record, month, year }) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const periodStr = `${monthNames[month - 1]} ${year}`;
  
  const { salarySnapshot, aggregatedData, netPay } = record;
  const earnings = salarySnapshot || {};
  const data = aggregatedData || {};

  // Earnings
  const basicPayVal = earnings.basicPay || 0;
  const allowancesVal = earnings.allowances || 0;
  const overtimePayVal = earnings.overtimePay || 0;
  const bonusesList = earnings.bonuses || [];
  const totalBonusVal = bonusesList.reduce((sum, b) => sum + b.amount, 0);
  const totalEarnings = basicPayVal + allowancesVal + overtimePayVal + totalBonusVal;

  // Deductions
  const unpaidLeavesVal = record.deductions?.unpaidLeavesAmount || 0;
  const advanceRecoveryVal = record.deductions?.advanceRecovery || 0;
  const taxesVal = record.deductions?.taxes || 0;

  // Extract statutory compliance deductions if any
  const otherDeductionKeys = Object.keys(record.deductions || {}).filter(
    k => !["unpaidLeavesAmount", "advanceRecovery", "taxes", "_recoveries", "_bonuses"].includes(k)
  );
  const otherDeductionsTotal = otherDeductionKeys.reduce((sum, k) => sum + (record.deductions[k] || 0), 0);
  const totalDeductions = unpaidLeavesVal + advanceRecoveryVal + taxesVal + otherDeductionsTotal;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payslip - ${employee.name} - ${periodStr}</title>
      <style>
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          color: #1f2937;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 13px;
          line-height: 1.5;
        }
        .payslip-container {
          max-width: 750px;
          margin: 0 auto;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 40px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #f3f4f6;
          padding-bottom: 24px;
          margin-bottom: 24px;
        }
        .company-details h1 {
          font-size: 22px;
          font-weight: 800;
          margin: 0 0 6px 0;
          color: #111827;
        }
        .company-details p {
          margin: 0;
          color: #4b5563;
          font-size: 12px;
        }
        .payslip-title {
          text-align: right;
        }
        .payslip-title h2 {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 6px 0;
          color: #10b981;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .payslip-title p {
          margin: 0;
          font-weight: 600;
          font-size: 14px;
          color: #374151;
        }
        .details-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          gap: 20px;
        }
        .details-section {
          flex: 1;
        }
        .details-section h3 {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #9ca3af;
          margin: 0 0 10px 0;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 6px;
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .details-label {
          color: #6b7280;
        }
        .details-value {
          color: #111827;
          font-weight: 600;
        }
        .table-container {
          margin-bottom: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          background-color: #f9fafb;
          color: #374151;
          font-weight: 700;
          text-align: left;
          padding: 10px 14px;
          font-size: 11px;
          text-transform: uppercase;
          border-bottom: 1px solid #e5e7eb;
        }
        td {
          padding: 12px 14px;
          border-bottom: 1px solid #f3f4f6;
          color: #4b5563;
        }
        .amount-col {
          text-align: right;
          font-weight: 600;
        }
        .total-row td {
          font-weight: 700;
          color: #111827;
          border-top: 1px solid #e5e7eb;
          border-bottom: 2px solid #e5e7eb;
          background-color: #f9fafb;
        }
        .summary-card {
          background: #111827;
          color: #ffffff;
          border-radius: 8px;
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .summary-text h3 {
          margin: 0;
          font-size: 11px;
          text-transform: uppercase;
          color: #9ca3af;
        }
        .summary-text p {
          margin: 4px 0 0 0;
          font-size: 24px;
          font-weight: 800;
        }
        .summary-status {
          background: #065f46;
          color: #34d399;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 9999px;
          text-transform: uppercase;
        }
        .footer {
          text-align: center;
          color: #9ca3af;
          font-size: 11px;
          border-top: 1px solid #f3f4f6;
          padding-top: 20px;
          margin-top: 40px;
        }
      </style>
    </head>
    <body>
      <div class="payslip-container">
        <div class="header">
          <div class="company-details">
            <h1>${business.name}</h1>
            <p>TaskFlow Managed Payroll Business</p>
            <p>Generated on ${dayjs().tz(TIMEZONE).format("DD MMM YYYY, hh:mm A")}</p>
          </div>
          <div class="payslip-title">
            <h2>Salary Slip</h2>
            <p>${periodStr}</p>
          </div>
        </div>

        <div class="details-grid">
          <div class="details-section">
            <h3>Employee Information</h3>
            <div class="details-row">
              <span class="details-label">Employee Name</span>
              <span class="details-value">${employee.name}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Role / Designation</span>
              <span class="details-value">${employee.role}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Phone Number</span>
              <span class="details-value">${employee.phoneNumber}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Joining Date</span>
              <span class="details-value">${dayjs(employee.dates.joiningDate).format("DD MMM YYYY")}</span>
            </div>
          </div>
          <div class="details-section">
            <h3>Attendance Summary</h3>
            <div class="details-row">
              <span class="details-label">Present Days</span>
              <span class="details-value">${data.totalPresentDays || 0} Days</span>
            </div>
            <div class="details-row">
              <span class="details-label">Absent Days</span>
              <span class="details-value">${data.totalAbsentDays || 0} Days</span>
            </div>
            <div class="details-row">
              <span class="details-label">Unpaid Leaves</span>
              <span class="details-value">${data.unpaidLeaves || 0} Days</span>
            </div>
            <div class="details-row">
              <span class="details-label">Overtime Hours</span>
              <span class="details-value">${data.overtimeHours || 0} hrs</span>
            </div>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="color: #10b981;">Earnings (+)</th>
                <th class="amount-col">Amount</th>
                <th style="color: #ef4444;">Deductions (-)</th>
                <th class="amount-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Salary</td>
                <td class="amount-col">${formatINR(basicPayVal)}</td>
                <td>Unpaid Leaves Deduction</td>
                <td class="amount-col">${formatINR(unpaidLeavesVal)}</td>
              </tr>
              <tr>
                <td>Allowances</td>
                <td class="amount-col">${formatINR(allowancesVal)}</td>
                <td>Advance Recovery</td>
                <td class="amount-col">${formatINR(advanceRecoveryVal)}</td>
              </tr>
              <tr>
                <td>Overtime Pay</td>
                <td class="amount-col">${formatINR(overtimePayVal)}</td>
                <td>Taxes / Professional Tax</td>
                <td class="amount-col">${formatINR(taxesVal)}</td>
              </tr>
              ${generateExtraRows(bonusesList, otherDeductionKeys, record.deductions)}
              <tr class="total-row">
                <td>Gross Earnings</td>
                <td class="amount-col">${formatINR(totalEarnings)}</td>
                <td>Total Deductions</td>
                <td class="amount-col">${formatINR(totalDeductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="summary-card">
          <div class="summary-text">
            <h3>Net Take-Home Pay</h3>
            <p>${formatINR(netPay)}</p>
          </div>
          <div class="summary-status">
            ${record.status === "Paid" ? "Paid" : "Processed"}
          </div>
        </div>

        <div class="footer">
          <p>This is a computer-generated document and does not require a physical signature.</p>
          <p>Powered by TaskFlow Payroll Engine</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateExtraRows(bonuses, deductionKeys, deductionsMap) {
  const maxRows = Math.max(bonuses.length, deductionKeys.length);
  let rowsHtml = "";
  
  for (let i = 0; i < maxRows; i++) {
    const bonus = bonuses[i];
    const dedKey = deductionKeys[i];
    
    const earnLabel = bonus ? `Bonus: ${bonus.title}` : "";
    const earnAmount = bonus ? formatINR(bonus.amount) : "";
    
    const dedLabel = dedKey ? dedKey : "";
    const dedAmount = dedKey ? formatINR(deductionsMap[dedKey] || 0) : "";
    
    rowsHtml += `
      <tr>
        <td>${earnLabel}</td>
        <td class="amount-col">${earnAmount}</td>
        <td>${dedLabel}</td>
        <td class="amount-col">${dedAmount}</td>
      </tr>
    `;
  }
  return rowsHtml;
}

function sendMockNotification(employee, record, month, year, payslipUrl) {
  const downloadLink = payslipUrl.startsWith("http") ? payslipUrl : `http://localhost:3000${payslipUrl}`;
  console.log(`\n======================================================`);
  console.log(`🔔 SMS/WHATSAPP NOTIFICATION DISPATCHED`);
  console.log(`------------------------------------------------------`);
  console.log(`To: ${employee.name} (${employee.phoneNumber})`);
  console.log(`Message: Dear ${employee.name}, your payslip for ${month}/${year} has been finalized. Net take-home pay: ${formatINR(record.netPay)}. Download your copy here: ${downloadLink}`);
  console.log(`======================================================\n`);
}
