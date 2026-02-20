import { useState, useRef, useEffect } from "react";
import { UserWithChats, useSupportChats, SupportChat } from "@/hooks/useSupportChats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { DeleteChatHistoryDialog } from "./DeleteChatHistoryDialog";

interface ChatConversationProps {
  user: UserWithChats;
  onChatDeleted?: () => void;
}

export function ChatConversation({ user, onChatDeleted }: ChatConversationProps) {
  const { answerChat, deleteChatHistory, sendAdminMessage } = useSupportChats();
  const [answer, setAnswer] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [user.user_id, user.chats]);

  const unansweredChats = user.chats.filter((c) => c.question && !c.answer);

  const handleSend = async () => {
    if (!answer.trim()) return;

    if (unansweredChats.length > 0) {
      await answerChat.mutateAsync({ chatId: unansweredChats[0].id, answer: answer.trim() });
    } else {
      await sendAdminMessage.mutateAsync({ userId: user.user_id, message: answer.trim() });
    }
    setAnswer("");
  };

  const handleDeleteChatHistory = async () => {
    await deleteChatHistory.mutateAsync(user.user_id);
    setShowDeleteDialog(false);
    onChatDeleted?.();
  };

  const isSending = answerChat.isPending || sendAdminMessage.isPending;

  return (
    <>
      {/* Header */}
      <div className="p-3 border-b bg-muted/50 flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback>
            {user.user_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{user.user_name}</p>
          <p className="text-sm text-muted-foreground">{user.user_email}</p>
        </div>
        {user.last_seen && (
          <span className="text-xs text-muted-foreground">
            Last seen {formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      <DeleteChatHistoryDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        userName={user.user_name}
        onConfirm={handleDeleteChatHistory}
        isDeleting={deleteChatHistory.isPending}
      />

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {user.chats.map((chat) => (
            <ChatMessage key={chat.id} chat={chat} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Input */}
      <div className="p-3 border-t bg-muted/30">
        {unansweredChats.length > 0 && (
          <span className="text-xs text-muted-foreground mb-2 block">
            {unansweredChats.length} unanswered {unansweredChats.length === 1 ? "message" : "messages"}
          </span>
        )}
        <div className="flex gap-2">
          <Textarea
            placeholder={unansweredChats.length > 0 ? "Reply to unanswered message..." : "Send a follow-up message..."}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            className="resize-none"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!answer.trim() || isSending}
            className="shrink-0 self-end"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

function ChatMessage({ chat }: { chat: SupportChat }) {
  return (
    <div className="space-y-2">
      {chat.question && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg p-3 bg-muted">
            <p className="whitespace-pre-wrap">{chat.question}</p>
            <span className="text-xs text-muted-foreground block mt-1">
              {format(new Date(chat.created_at), "MMM d, h:mm a")}
            </span>
          </div>
        </div>
      )}

      {chat.answer && (
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-lg p-3 bg-primary text-primary-foreground">
            <p className="whitespace-pre-wrap">{chat.answer}</p>
            <span className="text-xs opacity-70 block mt-1">
              {chat.answered_at &&
                format(new Date(chat.answered_at), "MMM d, h:mm a")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
