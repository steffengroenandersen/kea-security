"use client";

import { useState } from "react";
import { assignUserToBusiness } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AssignUserForm({ businessUuid }: { businessUuid: string }) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      const result = await assignUserToBusiness(formData, businessUuid);

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(true);
        // Reset form
        const form = document.querySelector("form") as HTMLFormElement;
        form?.reset();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign User to Business</CardTitle>
        <CardDescription>
          Add a user to this business by entering their email address
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/50 rounded-md">
              User assigned successfully
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">User Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="user@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Assigning..." : "Assign User"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
