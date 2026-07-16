import { Queue } from "bullmq";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Global cached client prevents hot-reloading from creating duplicate pools in dev mode
let cached = global.bullmq;

if (!cached) {
  cached = global.bullmq = { queue: null, payrollQueue: null, connection: null };
}

function ensureConnection() {
  if (!cached.connection) {
    cached.connection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Critical requirement for BullMQ
    });

    cached.connection.on("error", (err) => {
      console.error("Redis Connection Error (Queue Client):", err);
    });
  }
  return cached.connection;
}

export function getPayslipQueue() {
  const connection = ensureConnection();
  if (!cached.queue) {
    cached.queue = new Queue("payslip-generation", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true, // Auto-cleanup successful jobs
        removeOnFail: false,   // Keep failed jobs for debugging
      },
    });

    console.log("✅ BullMQ Payslip Queue Client Initialized.");
  }

  return cached.queue;
}

export function getPayrollQueue() {
  const connection = ensureConnection();
  if (!cached.payrollQueue) {
    cached.payrollQueue = new Queue("payroll-processing", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    console.log("✅ BullMQ Payroll Queue Client Initialized.");
  }

  return cached.payrollQueue;
}

