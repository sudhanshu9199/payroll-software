import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis("redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null
});

async function run() {
  const queue = new Queue("payroll-processing", { connection });
  const jobs = await queue.getJobs(["completed", "failed", "active", "waiting", "delayed"]);
  
  for (const job of jobs) {
    const state = await job.getState();
    console.log(`\n===================================`);
    console.log(`Job ID: ${job.id} | State: ${state}`);
    console.log(`Data:`, JSON.stringify(job.data, null, 2));
    console.log(`ReturnValue:`, JSON.stringify(job.returnvalue, null, 2));
  }

  connection.disconnect();
  process.exit(0);
}

run().catch(console.error);
