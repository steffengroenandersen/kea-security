import { redirect, notFound } from "next/navigation";
import { getSessionToken, validateSessionToken } from "@/lib/auth";
import { getUserBusinessAccess, getBusinessUsers } from "@/lib/auth/business";
import { getBusinessPortfolios } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { AssignUserForm } from "@/components/business/AssignUserForm";
import { BusinessUsersList } from "@/components/business/BusinessUsersList";
import { CreatePortfolioForm } from "@/components/business/CreatePortfolioForm";
import { PortfoliosList } from "@/components/business/PortfoliosList";
import { LogoUploadForm } from "@/components/business/LogoUploadForm";

interface BusinessPageProps {
  params: Promise<{
    businessUuid: string;
  }>;
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  // In Next.js 15+, params is a Promise and must be awaited
  const { businessUuid } = await params;

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

  // 3. Fetch business users and portfolios
  const users = await getBusinessUsers(businessAccess.businessId);
  const allPortfolios = await getBusinessPortfolios(businessAccess.businessId);
  const isAdmin = businessAccess.role === "admin";

  // 4. Filter portfolios based on user role
  // Admins see all portfolios, members only see visible ones
  const portfolios = isAdmin
    ? allPortfolios
    : allPortfolios.filter((p) => p.visibility === "visible");

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/app/business-manager">
            <Button variant="ghost" className="mb-4">
              ← Back to Business Manager
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{businessAccess.name}</h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Your role:{" "}
                <span
                  className={
                    businessAccess.role === "admin"
                      ? "text-blue-600 dark:text-blue-400 font-medium"
                      : ""
                  }
                >
                  {businessAccess.role === "admin" ? "Admin" : "Member"}
                </span>
              </p>
            </div>
            {businessAccess.logoUrl && (
              <img
                src={businessAccess.logoUrl}
                alt={`${businessAccess.name} logo`}
                className="w-16 h-16 rounded object-cover"
              />
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {/* Show portfolio creation form only to admins */}
          {isAdmin && <CreatePortfolioForm businessUuid={businessUuid} />}

          {/* Show logo upload form only to admins */}
          {isAdmin && (
            <LogoUploadForm
              businessUuid={businessUuid}
              currentLogoUrl={businessAccess.logoUrl}
            />
          )}

          {/* Show portfolios to everyone */}
          <PortfoliosList portfolios={portfolios} isAdmin={isAdmin} businessUuid={businessUuid} />

          {/* Show assign form only to admins */}
          {isAdmin && <AssignUserForm businessUuid={businessUuid} />}

          {/* Show user list to everyone */}
          <BusinessUsersList users={users} />

          {/* Future features placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Additional features in development
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>Toggle portfolio visibility (US008)</li>
                <li>Comments on portfolios (US012, US013)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
