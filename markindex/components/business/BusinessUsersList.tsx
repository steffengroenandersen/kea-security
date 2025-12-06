import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BusinessUser {
  userId: number;
  email: string;
  role: string;
}

export function BusinessUsersList({ users }: { users: BusinessUser[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Users</CardTitle>
        <CardDescription>
          Users who have access to this business
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users assigned yet</p>
        ) : (
          <ul className="space-y-2">
            {users.map((user) => (
              <li
                key={user.userId}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <span className="text-sm">{user.email}</span>
                <span className="text-xs px-2 py-1 bg-muted rounded-md font-medium">
                  {user.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
