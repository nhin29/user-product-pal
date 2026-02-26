import { UserConversation } from "@/hooks/useSupportChats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNowNY } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

interface UserChatListProps {
  conversations: UserConversation[];
  selectedConversationId: string | null;
  onSelectConversation: (convo: UserConversation) => void;
}

export function UserChatList({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: UserChatListProps) {
  return (
    <div className="divide-y">
      {conversations.map((convo) => {
        const isSelected = selectedConversationId === convo.conversation_id;
        const lastMsg = convo.messages[convo.messages.length - 1];

        return (
          <button
            key={convo.conversation_id}
            onClick={() => onSelectConversation(convo)}
            className={cn(
              "w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-start gap-3",
              isSelected && "bg-muted"
            )}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={convo.avatar_url || undefined} />
              <AvatarFallback>
                {convo.user_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">{convo.user_name}</span>
                {convo.unread_count > 0 && (
                  <Badge variant="default" className="shrink-0">
                    {convo.unread_count}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {convo.user_email}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {lastMsg?.message}
                </p>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNowNY(convo.last_message_at, {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {convo.last_seen && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Last seen {formatDistanceToNowNY(convo.last_seen, { addSuffix: true })}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
