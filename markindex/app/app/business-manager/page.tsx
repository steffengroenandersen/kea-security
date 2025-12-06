import { redirect } from "next/navigation";
import { getSessionToken, validateSessionToken } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Business Manager</CardTitle>
          <CardDescription>Manage your business portfolio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-md">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Logged in as:
            </p>
            <p className="font-medium">{user.email}</p>
          </div>
          <form action={logout} className="w-full">
            <Button type="submit" variant="outline" className="w-full">
              Log Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
