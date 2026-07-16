import { Queue } from "bullmq";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Global cached client prevents hot-reloading from creating duplicate pools in dev mode
let cached = global.bullmq;

if (!cached) {
  cached = global.bullmq = { queue: null, connection: null };
}

export function getPayslipQueue() {
  if (!cached.queue) {
    // Configure ioredis client
    cached.connection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Critical requirement for BullMQ
    });

    cached.connection.on("error", (err) => {
      console.error("Redis Connection Error (Queue Client):", err);
    });

    cached.queue = new Queue("payslip-generation", {
      connection: cached.connection,
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
