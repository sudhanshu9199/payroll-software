// lib/auth.js
import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "temp_fallback_secret_key_change_me_in_production_123456";

// Convert secret string to Uint8Array for jose compatibility
const secretKey = new TextEncoder().encode(JWT_SECRET);

/**
 * Sign a session payload into a JWT
 * @param {object} payload - { userId, role, businessId, employeeId }
 * @returns {Promise<string>} jwt token string
 */
export async function signJWT(payload) {
  try {
    return await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") // Token active for 7 days
      .sign(secretKey);
  } catch (error) {
    console.error("JWT signing failed:", error);
    throw error;
  }
}

/**
 * Verify a session JWT and return its payload
 * @param {string} token - jwt token string
 * @returns {Promise<object|null>} decoded payload or null if invalid
 */
export async function verifyJWT(token) {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey);
    return payload;
  } catch (error) {
    // Return null on expired or malformed token
    return null;
  }
}
