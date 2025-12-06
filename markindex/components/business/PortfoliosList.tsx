import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Portfolio {
  portfolioId: number;
  portfolioUuid: string;
  portfolioPublicUuid: string;
  title: string;
  visibility: string;
}

interface PortfoliosListProps {
  portfolios: Portfolio[];
  isAdmin: boolean;
  businessUuid: string;
}

export function PortfoliosList({ portfolios, isAdmin, businessUuid }: PortfoliosListProps) {
  if (portfolios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolios</CardTitle>
          <CardDescription>
            {isAdmin
              ? "No portfolios yet. Create one to get started."
              : "No portfolios available."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolios</CardTitle>
        <CardDescription>
          {isAdmin
            ? "All portfolios for this business"
            : "Portfolios you have access to"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {portfolios.map((portfolio) => (
            <Link
              key={portfolio.portfolioId}
              href={`/app/${businessUuid}/${portfolio.portfolioUuid}`}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer block"
            >
              <div className="flex-1">
                <h3 className="font-medium">{portfolio.title}</h3>
              </div>
              {isAdmin && (
                <Badge
                  variant={
                    portfolio.visibility === "visible" ? "default" : "secondary"
                  }
                >
                  {portfolio.visibility === "visible" ? "Visible" : "Hidden"}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
