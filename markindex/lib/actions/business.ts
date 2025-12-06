"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { business, userBusiness, user, portfolio, comment } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSessionToken, validateSessionToken } from "@/lib/auth";
import { getUserBusinessAccess } from "@/lib/auth/business";

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

// User assignment validation schema
const assignUserSchema = z.object({
  email: z.string().email().min(1).toLowerCase(),
});

/**
 * Assign user to business action - adds a user to a business as a member
 * Returns generic error message for failures to prevent information leakage
 */
export async function assignUserToBusiness(
  formData: FormData,
  businessUuid: string
) {
  try {
    // 1. Authenticate
    const token = await getSessionToken();
    if (!token) {
      return { error: "Unauthorized" };
    }

    const { user: currentUser } = await validateSessionToken(token);
    if (!currentUser) {
      return { error: "Unauthorized" };
    }

    // 2. Validate input (email only)
    const rawData = {
      email: formData.get("email"),
    };

    const result = assignUserSchema.safeParse(rawData);
    if (!result.success) {
      return { error: "Something went wrong" };
    }

    const { email } = result.data;

    // 3. Authorize - verify current user is admin of this business
    const businessAccess = await getUserBusinessAccess(
      currentUser.userId,
      businessUuid
    );
    if (!businessAccess) {
      return { error: "Something went wrong" };
    }

    if (businessAccess.role !== "admin") {
      return { error: "Something went wrong" };
    }

    // 4. Look up user by email
    const [targetUser] = await db
      .select({ userId: user.userId })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (!targetUser) {
      return { error: "Something went wrong" };
    }

    // 5. Check if user already assigned to this business
    const [existing] = await db
      .select()
      .from(userBusiness)
      .where(
        and(
          eq(userBusiness.userId, targetUser.userId),
          eq(userBusiness.businessId, businessAccess.businessId)
        )
      )
      .limit(1);

    if (existing) {
      return { error: "Something went wrong" };
    }

    // 6. Assign user as member
    await db.insert(userBusiness).values({
      userId: targetUser.userId,
      businessId: businessAccess.businessId,
      role: "member",
    });

    // 7. Revalidate the page to show updated user list
    revalidatePath(`/app/${businessUuid}`);
    return { success: true };
  } catch (error) {
    // Catch redirect errors and rethrow them
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    // Return generic error for all other failures
    return { error: "Something went wrong" };
  }
}

// Portfolio creation validation schema
const createPortfolioSchema = z.object({
  title: z
    .string()
    .min(1, "Portfolio title is required")
    .max(100, "Portfolio title must be less than 100 characters")
    .trim(),
});

/**
 * Create portfolio action - creates a new portfolio for a business
 * Only business admins can create portfolios
 * Portfolios are set to hidden by default
 */
export async function createPortfolio(
  formData: FormData,
  businessUuid: string
) {
  try {
    // 1. Authenticate
    const token = await getSessionToken();
    if (!token) {
      return { error: "Unauthorized" };
    }

    const { user: currentUser } = await validateSessionToken(token);
    if (!currentUser) {
      return { error: "Unauthorized" };
    }

    // 2. Validate input
    const rawData = {
      title: formData.get("title"),
    };

    const result = createPortfolioSchema.safeParse(rawData);
    if (!result.success) {
      return { error: "Invalid portfolio title" };
    }

    const { title } = result.data;

    // 3. Authorize - verify current user is admin of this business
    const businessAccess = await getUserBusinessAccess(
      currentUser.userId,
      businessUuid
    );
    if (!businessAccess) {
      return { error: "Something went wrong" };
    }

    if (businessAccess.role !== "admin") {
      return { error: "Something went wrong" };
    }

    // 4. Generate UUIDs
    const portfolioUuid = randomUUID();
    const portfolioPublicUuid = randomUUID();

    // 5. Create portfolio (hidden by default per US007)
    await db.insert(portfolio).values({
      portfolioUuid,
      portfolioPublicUuid,
      businessId: businessAccess.businessId,
      title,
      visibility: "hidden", // Hidden by default per US007
    });

    // 6. Revalidate the page to show updated portfolio list
    revalidatePath(`/app/${businessUuid}`);
    return { success: true };
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
 * Get all portfolios for a business
 */
export async function getBusinessPortfolios(businessId: number) {
  const portfolios = await db
    .select({
      portfolioId: portfolio.portfolioId,
      portfolioUuid: portfolio.portfolioUuid,
      portfolioPublicUuid: portfolio.portfolioPublicUuid,
      title: portfolio.title,
      visibility: portfolio.visibility,
    })
    .from(portfolio)
    .where(eq(portfolio.businessId, businessId))
    .orderBy(portfolio.title);

  return portfolios;
}

/**
 * Toggle portfolio visibility action (US008)
 * Only business admins can toggle visibility
 * Toggles between 'visible' and 'hidden'
 */
export async function togglePortfolioVisibility(
  portfolioUuid: string,
  businessUuid: string
) {
  try {
    // 1. Authenticate
    const token = await getSessionToken();
    if (!token) {
      return { error: "Unauthorized" };
    }

    const { user: currentUser } = await validateSessionToken(token);
    if (!currentUser) {
      return { error: "Unauthorized" };
    }

    // 2. Authorize - verify current user is admin of this business
    const businessAccess = await getUserBusinessAccess(
      currentUser.userId,
      businessUuid
    );
    if (!businessAccess) {
      return { error: "Something went wrong" };
    }

    if (businessAccess.role !== "admin") {
      return { error: "Something went wrong" };
    }

    // 3. Get current portfolio to verify it belongs to this business
    const portfolioResult = await db
      .select({
        portfolioId: portfolio.portfolioId,
        visibility: portfolio.visibility,
      })
      .from(portfolio)
      .where(
        and(
          eq(portfolio.portfolioUuid, portfolioUuid),
          eq(portfolio.businessId, businessAccess.businessId)
        )
      )
      .limit(1);

    if (portfolioResult.length === 0) {
      return { error: "Something went wrong" };
    }

    const currentPortfolio = portfolioResult[0];

    // 4. Toggle visibility
    const newVisibility =
      currentPortfolio.visibility === "visible" ? "hidden" : "visible";

    await db
      .update(portfolio)
      .set({ visibility: newVisibility })
      .where(eq(portfolio.portfolioUuid, portfolioUuid));

    // 5. Revalidate the page to show updated visibility
    revalidatePath(`/app/${businessUuid}`);
    return { success: true };
  } catch (error) {
    // Catch redirect errors and rethrow them
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    // Return generic error for all other failures
    return { error: "Something went wrong" };
  }
}

// Comment validation schema
const addCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be less than 1000 characters")
    .trim(),
});

/**
 * Add comment to portfolio action (US012)
 * Users can comment on portfolios they have access to
 * Comment content is validated and sanitized
 */
export async function addComment(
  formData: FormData,
  portfolioUuid: string,
  businessUuid: string
) {
  try {
    // 1. Authenticate
    const token = await getSessionToken();
    if (!token) {
      return { error: "Unauthorized" };
    }

    const { user: currentUser } = await validateSessionToken(token);
    if (!currentUser) {
      return { error: "Unauthorized" };
    }

    // 2. Validate input
    const rawData = {
      content: formData.get("content"),
    };

    const result = addCommentSchema.safeParse(rawData);
    if (!result.success) {
      return { error: "Invalid comment" };
    }

    const { content } = result.data;

    // 3. Authorize - verify user has access to this business
    const businessAccess = await getUserBusinessAccess(
      currentUser.userId,
      businessUuid
    );
    if (!businessAccess) {
      return { error: "Something went wrong" };
    }

    // 4. Get portfolio and verify it belongs to this business
    const portfolioResult = await db
      .select({
        portfolioId: portfolio.portfolioId,
        visibility: portfolio.visibility,
      })
      .from(portfolio)
      .where(
        and(
          eq(portfolio.portfolioUuid, portfolioUuid),
          eq(portfolio.businessId, businessAccess.businessId)
        )
      )
      .limit(1);

    if (portfolioResult.length === 0) {
      return { error: "Something went wrong" };
    }

    const currentPortfolio = portfolioResult[0];

    // 5. Check visibility - members can only comment on visible portfolios
    // Admins can comment on any portfolio
    if (
      businessAccess.role !== "admin" &&
      currentPortfolio.visibility !== "visible"
    ) {
      return { error: "Something went wrong" };
    }

    // 6. Generate UUID and create comment
    const commentUuid = randomUUID();

    await db.insert(comment).values({
      commentUuid,
      portfolioId: currentPortfolio.portfolioId,
      userId: currentUser.userId,
      content,
    });

    // 7. Revalidate the page to show new comment
    revalidatePath(`/app/${businessUuid}/${portfolioUuid}`);
    return { success: true };
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
 * Get all comments for a portfolio with user information (US013)
 * Returns comments in chronological order
 */
export async function getPortfolioComments(portfolioId: number) {
  const comments = await db
    .select({
      commentId: comment.commentId,
      commentUuid: comment.commentUuid,
      content: comment.content,
      createdAt: comment.createdAt,
      userId: comment.userId,
      userEmail: user.email,
    })
    .from(comment)
    .innerJoin(user, eq(comment.userId, user.userId))
    .where(eq(comment.portfolioId, portfolioId))
    .orderBy(desc(comment.createdAt));

  return comments;
}
