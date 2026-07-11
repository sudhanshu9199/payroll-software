// app/api/v1/auth/signup/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { User, Business } from "@/lib/models";
import { signJWT } from "@/lib/auth";
import bcrypt from "bcrypt"; // Matched to login route
import { z } from "zod";

// 1. Strict Input Validation Schema via Zod
const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email format").toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["Admin", "Employee", "User"]), // Adjust enums to your needs
    businessName: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      // If Admin, businessName is strictly required
      if (data.role === "Admin" && !data.businessName) return false;
      return true;
    },
    {
      message: "Business name required for Admin registration",
      path: ["businessName"],
    },
  );

export async function POST(request) {
  try {
    await dbConnect();

    // Parse and validate incoming payload safely
    const json = await request.json();
    const parseResult = signupSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid payload structural format",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { name, email, password, role, businessName } = parseResult.data;

    // Check if user already exists using .lean() for performance
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }, // 409 Conflict is more semantically correct here than 400
      );
    }

    // Hash password using native bcrypt
    const hashedPassword = await bcrypt.hash(password, 12); // Cost factor of 12 is the 2026 standard

    // 2. Start a MongoDB Session for ACID Transactions
    // Note: Transactions require your MongoDB database to be running as a Replica Set (standard on MongoDB Atlas)
    const session = await mongoose.startSession();
    session.startTransaction();

    let newUser;
    let businessId = null;

    try {
      // Create User within the transaction session
      const userDoc = new User({
        name,
        email,
        password: hashedPassword,
        role,
      });
      newUser = await userDoc.save({ session });

      // If role is Admin, create Business and link it within the SAME transaction
      if (role === "Admin") {
        const newBusiness = new Business({
          name: businessName,
          ownerId: newUser._id,
        });
        const savedBusiness = await newBusiness.save({ session });

        businessId = savedBusiness._id;
        newUser.businessId = businessId;

        // Save the updated user with the businessId
        await newUser.save({ session });
      }

      // Commit the transaction - Everything saves at once
      await session.commitTransaction();
    } catch (transactionError) {
      // If anything fails (User or Business), abort everything. No dirty data.
      await session.abortTransaction();
      throw transactionError; // Pass to the outer catch block
    } finally {
      session.endSession();
    }

    // Generate JWT payload
    const tokenPayload = {
      userId: newUser._id.toString(),
      role: newUser.role,
      businessId: businessId ? businessId.toString() : null,
      employeeId: null,
    };

    const token = await signJWT(tokenPayload);

    // Build standard secured response
    const response = NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          businessId,
        },
      },
      { status: 201 },
    );

    // Cookie Security Configuration (Matched to Login)
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
    console.error("Critical Signup Fault Exception:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
