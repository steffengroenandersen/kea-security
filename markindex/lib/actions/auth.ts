"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { user, session } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  setSessionCookie,
  deleteSessionCookie,
  getSessionToken,
  validateSessionToken,
  invalidateSession,
} from "@/lib/auth/session";

// Signup validation schema
const signupSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    repeatPassword: z.string(),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "Passwords do not match",
    path: ["repeatPassword"],
  });

// Login validation schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Signup action - creates a new user account
 * Returns generic error message for all failures to prevent information leakage
 */
export async function signup(formData: FormData) {
  try {
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
      repeatPassword: formData.get("repeatPassword"),
    };

    const result = signupSchema.safeParse(rawData);

    if (!result.success) {
      return { error: "Something went wrong" };
    }

    const { email, password } = result.data;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return { error: "Something went wrong" };
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // Generate UUIDs for user
    const userUuid = randomUUID();
    const userPublicUuid = randomUUID();

    // Create user in database
    await db.insert(user).values({
      userUuid,
      userPublicUuid,
      email,
      passwordHash,
    });

    // Redirect to login page
    redirect("/login");
  } catch (error) {
    // Catch redirect errors and rethrow them
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    // Return generic error for all other failures
    return { error: "Something went wrong" };
  }
}

/**
 * Login action - authenticates a user and creates a session
 * Returns generic error message for all failures to prevent enumeration
 */
export async function login(formData: FormData) {
  try {
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const result = loginSchema.safeParse(rawData);

    if (!result.success) {
      return { error: "Something went wrong" };
    }

    const { email, password } = result.data;

    // Find user by email
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (!existingUser) {
      return { error: "Something went wrong" };
    }

    // Verify password
    const validPassword = await verifyPassword(
      existingUser.passwordHash,
      password
    );

    if (!validPassword) {
      return { error: "Something went wrong" };
    }

    // Create session
    const { token, expiresAt } = await createSession(existingUser.userId);

    // Set session cookie
    await setSessionCookie(token, expiresAt);

    // Redirect to business manager
    redirect("/app/business-manager");
  } catch (error) {
    // Catch redirect errors and rethrow them
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    // Return generic error for all other failures
    return { error: "Something went wrong" };
  }
}

/**
 * Logout action - invalidates the current session
 */
export async function logout() {
  try {
    // Get current session token
    const token = await getSessionToken();

    if (token) {
      // Validate and get session
      const { session: currentSession } = await validateSessionToken(token);

      if (currentSession) {
        // Invalidate session in database
        await invalidateSession(currentSession.sessionId);
      }
    }

    // Delete session cookie
    await deleteSessionCookie();

    // Redirect to home
    redirect("/");
  } catch (error) {
    // Catch redirect errors and rethrow them
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    // Silently fail on logout errors
    redirect("/");
  }
}
