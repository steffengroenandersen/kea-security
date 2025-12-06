"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { togglePortfolioVisibility } from "@/lib/actions/business";

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
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleToggleVisibility = async (portfolioUuid: string, portfolioId: number) => {
    setTogglingId(portfolioId);
    try {
      const result = await togglePortfolioVisibility(portfolioUuid, businessUuid);
      if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      alert("Failed to toggle visibility");
    } finally {
      setTogglingId(null);
    }
  };

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
            <div
              key={portfolio.portfolioId}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <Link
                href={`/app/${businessUuid}/${portfolio.portfolioUuid}`}
                className="flex-1"
              >
                <h3 className="font-medium hover:underline">{portfolio.title}</h3>
              </Link>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      portfolio.visibility === "visible" ? "default" : "secondary"
                    }
                  >
                    {portfolio.visibility === "visible" ? "Visible" : "Hidden"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleVisibility(portfolio.portfolioUuid, portfolio.portfolioId)}
                    disabled={togglingId === portfolio.portfolioId}
                  >
                    {togglingId === portfolio.portfolioId ? "..." : "Toggle"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
