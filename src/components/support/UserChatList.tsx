import { UserWithChats } from "@/hooks/useSupportChats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface UserChatListProps {
  users: UserWithChats[];
  selectedUserId: string | null;
  onSelectUser: (user: UserWithChats) => void;
}

export function UserChatList({
  users,
  selectedUserId,
  onSelectUser,
}: UserChatListProps) {
  return (
    <div className="divide-y">
      {users.map((user) => {
        const isSelected = selectedUserId === user.user_id;
        const lastChat = user.chats[user.chats.length - 1];

        return (
          <button
            key={user.user_id}
            onClick={() => onSelectUser(user)}
            className={cn(
              "w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-start gap-3",
              isSelected && "bg-muted"
            )}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>
                {user.user_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">{user.user_name}</span>
                {user.unread_count > 0 && (
                  <Badge variant="default" className="shrink-0">
                    {user.unread_count}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {user.user_email}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {lastChat?.question || lastChat?.answer}
                </p>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(user.last_message_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {user.last_seen && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Last seen {formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
