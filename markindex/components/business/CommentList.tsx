import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Comment {
  commentId: number;
  commentUuid: string;
  content: string;
  createdAt: Date;
  userId: number;
  userEmail: string;
}

interface CommentListProps {
  comments: Comment[];
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-500 dark:text-zinc-400">
            No comments yet. Be the first to comment!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comments ({comments.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.commentUuid}
              className="border-b border-zinc-200 dark:border-zinc-800 pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {comment.userEmail}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
