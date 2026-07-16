import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { generatePayslipHtml } from "../worker.js";

async function testPdfGeneration() {
  console.log("🧪 Starting Payslip PDF Generation Test...");

  const mockBusiness = {
    name: "Acme Supertech Solutions Private Limited",
  };

  const mockEmployee = {
    name: "Rajesh Kumar",
    role: "Senior Fullstack Developer",
    phoneNumber: "+91 98765 43210",
    dates: {
      joiningDate: new Date("2024-03-15"),
    },
  };

  const mockRecord = {
    netPay: 24760.50,
    status: "Generated",
    salarySnapshot: {
      basicPay: 18000,
      allowances: 4500,
      overtimePay: 1260.50,
      bonuses: [
        { title: "Performance Bonus", amount: 2500 },
        { title: "Special Allowance", amount: 500 }
      ],
    },
    aggregatedData: {
      totalPresentDays: 28,
      totalAbsentDays: 1,
      unpaidLeaves: 1,
      overtimeHours: 6.5,
    },
    deductions: {
      unpaidLeavesAmount: 650,
      advanceRecovery: 1000,
      taxes: 200,
      "Provident Fund (EPF)": 2160,
      "Employee State Insurance (ESIC)": 189,
    },
  };

  const html = generatePayslipHtml({
    business: mockBusiness,
    employee: mockEmployee,
    record: mockRecord,
    month: 6,
    year: 2026,
  });

  const outputDir = path.join(process.cwd(), "public", "payslips");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "test-payslip.pdf");
  console.log(`🖥️ Launching Puppeteer to render PDF to: ${outputPath}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        right: "15mm",
        bottom: "15mm",
        left: "15mm",
      },
    });

    console.log("✅ PDF generated successfully!");
    console.log(`Verify it at: ${outputPath}`);
  } catch (err) {
    console.error("❌ PDF Generation Failed:", err);
  } finally {
    await browser.close();
  }
}

testPdfGeneration().catch(console.error);
