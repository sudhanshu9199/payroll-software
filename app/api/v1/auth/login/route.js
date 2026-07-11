// app/api/v1/auth/login/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User, Employee } from "@/lib/models";
import { signJWT } from "@/lib/auth";
import bcrypt from "bcrypt"; // Upgraded from 'bcryptjs' for native runtime speed
import { z } from "zod";

// 1. Strict Input Validation Schema via Zod
const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Identifier is required"),
  password: z.string().min(1, "Password is required"),
});

// A verified complex dummy hash used to neutralize timing attacks
const DUMMY_HASH =
  "$2b$12$d7P1G2m3K4q5L6r7S8t9uO.eA6B7C8D9E0F1G2H3I4J5K6L7M8N9O";

export async function POST(request) {
  try {
    await dbConnect();

    // Parse and validate incoming payload safely
    const json = await request.json();
    const parseResult = loginSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid payload structural format",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { identifier, password } = parseResult.data;

    let user = null;
    let employeeId = null;
    let businessId = null;

    const isEmail = identifier.includes("@");

    // 2. Optimized Database Lookups
    if (isEmail) {
      user = await User.findOne({ email: identifier.toLowerCase() }).lean();
    } else {
      const cleanPhone = identifier.replace(/\D/g, "");
      const employee = await Employee.findOne({
        $or: [{ phoneNumber: identifier }, { phoneNumber: cleanPhone }],
      }).lean();

      if (employee && employee.userId) {
        user = await User.findById(employee.userId).lean();
        employeeId = employee._id.toString();
        businessId = employee.businessId?.toString() || null;
      }
    }

    // 3. Mitigate Timing Attacks / User Enumeration
    // If user doesn't exist, we compare against a dummy hash to waste identical CPU cycles
    const hashToCompare = user ? user.password : DUMMY_HASH;
    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !isMatch) {
      return NextResponse.json(
        { error: "Invalid email/phone number or password" },
        { status: 401 },
      );
    }

    // 4. Resolve Lazy Context Fetching
    if (user.role === "Admin") {
      businessId = user.businessId ? user.businessId.toString() : null;
    } else if (user.role === "Employee" && !employeeId) {
      const employee = await Employee.findOne({ userId: user._id }).lean();
      if (employee) {
        employeeId = employee._id.toString();
        businessId = employee.businessId?.toString() || null;
      }
    }

    // Generate JWT payload
    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      businessId,
      employeeId,
    };

    const token = await signJWT(tokenPayload);

    // Build standard secured response
    const response = NextResponse.json(
      {
        success: true,
        message: "Logged in successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          businessId,
          employeeId,
        },
      },
      { status: 200 },
    );

    // Cookie Security Configuration
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    // Avoid exposing system internals via error response
    console.error("Critical Auth Fault Exception:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
