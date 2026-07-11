// lib/db.js
import mongoose from "mongoose";
import dns from "dns";

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI && process.env.NODE_ENV === "production") {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside your env configuration.",
  );
}

// Global cached connection prevents hot-reloading from creating duplicate pools in dev mode
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // If connection is already cached, reuse it
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10, // Optimized connection pooling for concurrent check-ins
      serverSelectionTimeoutMS: 5000,
    };

    const uri = MONGODB_URI || "mongodb://localhost:27017/payroll_software";

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log(
        `✅ MongoDB Connected to database: ${mongooseInstance.connection.name}`,
      );
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    throw error;
  }

  return cached.conn;
}

export default dbConnect;
