import { redirect, notFound } from "next/navigation";
import { getSessionToken, validateSessionToken } from "@/lib/auth";
import { getUserBusinessAccess } from "@/lib/auth/business";
import { getPortfolioComments } from "@/lib/actions/business";
import { db } from "@/lib/db";
import { portfolio } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CommentForm } from "@/components/business/CommentForm";
import { CommentList } from "@/components/business/CommentList";

interface PortfolioPageProps {
  params: Promise<{
    businessUuid: string;
    portfolioUuid: string;
  }>;
}

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  // In Next.js 15+, params is a Promise and must be awaited
  const { businessUuid, portfolioUuid } = await params;

  // 1. Authentication
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }

  const { user } = await validateSessionToken(token);
  if (!user) {
    redirect("/login");
  }

  // 2. Authorization - check business access
  const businessAccess = await getUserBusinessAccess(
    user.userId,
    businessUuid
  );

  if (!businessAccess) {
    // User doesn't have access to this business
    notFound(); // Shows 404 instead of revealing existence
  }

  // 3. Fetch portfolio
  const [portfolioData] = await db
    .select({
      portfolioId: portfolio.portfolioId,
      portfolioUuid: portfolio.portfolioUuid,
      portfolioPublicUuid: portfolio.portfolioPublicUuid,
      title: portfolio.title,
      visibility: portfolio.visibility,
      businessId: portfolio.businessId,
    })
    .from(portfolio)
    .where(eq(portfolio.portfolioUuid, portfolioUuid))
    .limit(1);

  if (!portfolioData) {
    notFound();
  }

  // 4. Verify portfolio belongs to the business
  if (portfolioData.businessId !== businessAccess.businessId) {
    notFound();
  }

  // 5. Authorization - check portfolio visibility
  const isAdmin = businessAccess.role === "admin";
  const isVisible = portfolioData.visibility === "visible";

  // Non-admins can only see visible portfolios
  if (!isAdmin && !isVisible) {
    notFound();
  }

  // 6. Fetch comments (US013)
  const comments = await getPortfolioComments(portfolioData.portfolioId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/app/${businessUuid}`}>
            <Button variant="ghost" className="mb-4">
              ← Back to {businessAccess.name}
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{portfolioData.title}</h1>
                {isAdmin && (
                  <Badge
                    variant={isVisible ? "default" : "secondary"}
                  >
                    {isVisible ? "Visible" : "Hidden"}
                  </Badge>
                )}
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Business: {businessAccess.name}
              </p>
            </div>
          </div>
        </div>

        {/* Portfolio Content */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Details</CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Portfolio information and content"
                  : "View portfolio content"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Portfolio UUID
                  </p>
                  <p className="font-mono text-sm">{portfolioData.portfolioUuid}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Visibility Status
                  </p>
                  <p className="font-medium">
                    {portfolioData.visibility === "visible" ? "Visible to all business members" : "Hidden (admins only)"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section (US012, US013) */}
          <CommentList comments={comments} />

          {/* Add Comment Form (US012) */}
          <CommentForm
            portfolioUuid={portfolioUuid}
            businessUuid={businessUuid}
          />
        </div>
      </div>
    </div>
  );
}
