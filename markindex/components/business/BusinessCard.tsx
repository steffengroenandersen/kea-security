import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BusinessCardProps {
  business: {
    businessUuid: string;
    name: string;
    logoUrl: string | null;
    role: string;
  };
}

export function BusinessCard({ business }: BusinessCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{business.name}</CardTitle>
            <CardDescription className="mt-1">
              <span
                className={
                  business.role === "admin"
                    ? "text-blue-600 dark:text-blue-400 font-medium"
                    : "text-zinc-600 dark:text-zinc-400"
                }
              >
                {business.role === "admin" ? "Admin" : "Member"}
              </span>
            </CardDescription>
          </div>
          {business.logoUrl && (
            <img
              src={business.logoUrl}
              alt={`${business.name} logo`}
              className="w-12 h-12 rounded object-cover"
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Link href={`/app/${business.businessUuid}`}>
          <Button className="w-full">View Business</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
