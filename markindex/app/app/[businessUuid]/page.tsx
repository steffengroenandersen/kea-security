import { redirect, notFound } from "next/navigation";
import { getSessionToken, validateSessionToken } from "@/lib/auth";
import { getUserBusinessAccess } from "@/lib/auth/business";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

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
        <Card>
          <CardHeader>
            <CardTitle>Business Dashboard</CardTitle>
            <CardDescription>
              Manage portfolios and team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600 dark:text-zinc-400">
              This is the business detail page. Future features will include:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-600 dark:text-zinc-400">
              <li>Portfolio management (US007, US008, US009, US010)</li>
              <li>Team member management (US005)</li>
              <li>Logo upload (US006)</li>
              <li>Comments on portfolios (US012, US013)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
