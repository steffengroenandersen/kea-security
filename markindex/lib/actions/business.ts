"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { business, userBusiness } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSessionToken, validateSessionToken } from "@/lib/auth";

// Business creation validation schema
const createBusinessSchema = z.object({
  name: z
    .string()
    .min(1, "Business name is required")
    .max(100, "Business name must be less than 100 characters")
    .trim(),
});

/**
 * Create business action - creates a new business and assigns creator as admin
 * Returns generic error message for failures to prevent information leakage
 */
export async function createBusiness(formData: FormData) {
  try {
    // 1. Authenticate user
    const token = await getSessionToken();
    if (!token) {
      return { error: "Unauthorized" };
    }

    const { user } = await validateSessionToken(token);
    if (!user) {
      return { error: "Unauthorized" };
    }

    // 2. Validate input
    const rawData = {
      name: formData.get("name"),
    };

    const result = createBusinessSchema.safeParse(rawData);
    if (!result.success) {
      return { error: "Invalid business name" };
    }

    const { name } = result.data;

    // 3. Generate UUIDs
    const businessUuid = randomUUID();
    const businessPublicUuid = randomUUID();

    // 4. Use transaction to ensure atomicity
    const newBusiness = await db.transaction(async (tx) => {
      // Insert business
      const [createdBusiness] = await tx
        .insert(business)
        .values({
          businessUuid,
          businessPublicUuid,
          name,
          logoUrl: null,
        })
        .returning();

      // Assign creator as admin
      await tx.insert(userBusiness).values({
        userId: user.userId,
        businessId: createdBusiness.businessId,
        role: "admin",
      });

      return createdBusiness;
    });

    // 5. Redirect to the business page
    redirect(`/app/${newBusiness.businessUuid}`);
  } catch (error) {
    // Catch redirect errors and rethrow them
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    // Return generic error for all other failures
    return { error: "Failed to create business" };
  }
}

/**
 * Get all businesses for a user with their role
 */
export async function getUserBusinesses(userId: number) {
  const businesses = await db
    .select({
      businessId: business.businessId,
      businessUuid: business.businessUuid,
      businessPublicUuid: business.businessPublicUuid,
      name: business.name,
      logoUrl: business.logoUrl,
      role: userBusiness.role,
    })
    .from(userBusiness)
    .innerJoin(business, eq(userBusiness.businessId, business.businessId))
    .where(eq(userBusiness.userId, userId))
    .orderBy(business.name);

  return businesses;
}
