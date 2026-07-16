// app/api/v1/payroll/status/route.js
import { NextResponse } from "next/server";
import { getPayrollQueue } from "@/lib/queue";
import { verifyJWT } from "@/lib/auth";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Session missing." }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || session.role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "jobId is required." }, { status: 400 });
    }

    const queue = getPayrollQueue();
    const job = await queue.getJob(jobId);
    if (!job) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }

    const state = await job.getState(); // 'active', 'completed', 'failed', etc.
    
    return NextResponse.json({
      success: true,
      jobId,
      state,
      progress: job.progress,
      failedReason: job.failedReason,
    });
  } catch (error) {
    console.error("[GET Payroll Status] Error:", error);
    return NextResponse.json({ error: "Failed to retrieve status." }, { status: 500 });
  }
}
