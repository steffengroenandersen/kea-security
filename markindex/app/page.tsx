import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">MarkIndex</CardTitle>
          <CardDescription>
            Portfolio Management Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button asChild size="lg" className="w-full">
            <Link href="/signup">Sign Up</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/login">Log In</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
