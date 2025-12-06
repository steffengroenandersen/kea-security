import { db } from "@/lib/db";
import { business, userBusiness, user } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Check if user has access to a business
 * @param userId - The user's ID
 * @param businessUuid - The business UUID
 * @returns Business data with user role, or null if no access
 */
export async function getUserBusinessAccess(
  userId: number,
  businessUuid: string
) {
  const result = await db
    .select({
      businessId: business.businessId,
      businessUuid: business.businessUuid,
      businessPublicUuid: business.businessPublicUuid,
      name: business.name,
      logoUrl: business.logoUrl,
      role: userBusiness.role,
    })
    .from(business)
    .innerJoin(userBusiness, eq(business.businessId, userBusiness.businessId))
    .where(
      and(
        eq(business.businessUuid, businessUuid),
        eq(userBusiness.userId, userId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Check if user is admin of a business
 * @param userId - The user's ID
 * @param businessUuid - The business UUID
 * @returns True if user is admin, false otherwise
 */
export async function isBusinessAdmin(
  userId: number,
  businessUuid: string
): Promise<boolean> {
  const access = await getUserBusinessAccess(userId, businessUuid);
  return access?.role === "admin";
}

/**
 * Get all users assigned to a business with their roles
 * @param businessId - The business ID (internal)
 * @returns Array of users with email and role
 */
export async function getBusinessUsers(businessId: number) {
  const users = await db
    .select({
      userId: user.userId,
      email: user.email,
      role: userBusiness.role,
    })
    .from(userBusiness)
    .innerJoin(user, eq(userBusiness.userId, user.userId))
    .where(eq(userBusiness.businessId, businessId))
    .orderBy(user.email);

  return users;
}
