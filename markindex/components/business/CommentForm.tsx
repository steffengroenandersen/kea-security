"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addComment } from "@/lib/actions/business";

interface CommentFormProps {
  portfolioUuid: string;
  businessUuid: string;
}

export function CommentForm({
  portfolioUuid,
  businessUuid,
}: CommentFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      return await addComment(formData, portfolioUuid, businessUuid);
    },
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Comment</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div>
            <Textarea
              name="content"
              placeholder="Type your comment here..."
              required
              disabled={isPending}
              className="min-h-[100px]"
            />
          </div>

          {state && "error" in state && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}

          {state && "success" in state && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Comment posted successfully!
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Posting..." : "Post"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
