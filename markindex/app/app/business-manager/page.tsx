import { redirect } from "next/navigation";
import { getSessionToken, validateSessionToken } from "@/lib/auth";
import { getUserBusinesses } from "@/lib/actions/business";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BusinessCard } from "@/components/business/BusinessCard";
import { CreateBusinessForm } from "@/components/business/CreateBusinessForm";

export default async function BusinessManagerPage() {
  // Server-side session validation
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }

  const { user } = await validateSessionToken(token);
  if (!user) {
    redirect("/login");
  }

  // Fetch user's businesses
  const businesses = await getUserBusinesses(user.userId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black p-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Business Manager</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Logged in as {user.email}
            </p>
          </div>
          <form action={logout}>
            <Button variant="outline">Log Out</Button>
          </form>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Business List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Businesses</h2>
            {businesses.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-zinc-500 dark:text-zinc-400">
                    No businesses yet. Create your first business to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {businesses.map((business) => (
                  <BusinessCard key={business.businessId} business={business} />
                ))}
              </div>
            )}
          </div>

          {/* Create Business Form */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Create Business</h2>
            <CreateBusinessForm />
          </div>
        </div>
      </div>
    </div>
  );
}
