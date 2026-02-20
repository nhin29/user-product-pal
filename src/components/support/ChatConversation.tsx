import { useState, useRef, useEffect } from "react";
import { UserConversation, ChatMessage, useSupportChats } from "@/hooks/useSupportChats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { DeleteChatHistoryDialog } from "./DeleteChatHistoryDialog";

interface ChatConversationProps {
  conversation: UserConversation;
  onChatDeleted?: () => void;
}

export function ChatConversation({ conversation, onChatDeleted }: ChatConversationProps) {
  const { sendMessage, deleteConversation } = useSupportChats();
  const [message, setMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.conversation_id, conversation.messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    await sendMessage.mutateAsync({
      conversationId: conversation.conversation_id,
      message: message.trim(),
    });
    setMessage("");
  };

  const handleDelete = async () => {
    await deleteConversation.mutateAsync(conversation.conversation_id);
    setShowDeleteDialog(false);
    onChatDeleted?.();
  };

  return (
    <>
      {/* Header */}
      <div className="p-3 border-b bg-muted/50 flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversation.avatar_url || undefined} />
          <AvatarFallback>
            {conversation.user_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{conversation.user_name}</p>
          <p className="text-sm text-muted-foreground">{conversation.user_email}</p>
        </div>
        {conversation.last_seen && (
          <span className="text-xs text-muted-foreground">
            Last seen {formatDistanceToNow(new Date(conversation.last_seen), { addSuffix: true })}
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
        userName={conversation.user_name}
        onConfirm={handleDelete}
        isDeleting={deleteConversation.isPending}
      />

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {conversation.messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Input */}
      <div className="p-3 border-t bg-muted/30">
        {conversation.unread_count > 0 && (
          <span className="text-xs text-muted-foreground mb-2 block">
            {conversation.unread_count} unanswered{" "}
            {conversation.unread_count === 1 ? "message" : "messages"}
          </span>
        )}
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
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
            disabled={!message.trim() || sendMessage.isPending}
            className="shrink-0 self-end"
          >
            {sendMessage.isPending ? (
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

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isAdmin = msg.sender_role === "admin";

  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isAdmin
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        <p className="whitespace-pre-wrap">{msg.message}</p>
        <span className={`text-xs block mt-1 ${isAdmin ? "opacity-70" : "text-muted-foreground"}`}>
          {format(new Date(msg.created_at), "MMM d, h:mm a")}
        </span>
      </div>
    </div>
  );
}
