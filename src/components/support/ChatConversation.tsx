import { useState, useRef, useEffect } from "react";
import { UserWithChats, useSupportChats, SupportChat } from "@/hooks/useSupportChats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DeleteChatHistoryDialog } from "./DeleteChatHistoryDialog";

interface ChatConversationProps {
  user: UserWithChats;
  onChatDeleted?: () => void;
}

export function ChatConversation({ user, onChatDeleted }: ChatConversationProps) {
  const { answerChat, autoReplyChat, deleteChatHistory } = useSupportChats();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when user changes or new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [user.user_id, user.chats]);

  const handleSendAnswer = async () => {
    if (!replyingTo || !answer.trim()) return;

    await answerChat.mutateAsync({ chatId: replyingTo, answer: answer.trim() });
    setAnswer("");
    setReplyingTo(null);
  };

  const handleAutoReply = async (chat: SupportChat) => {
    await autoReplyChat.mutateAsync({
      chatId: chat.id,
      question: chat.question,
      userName: user.user_name,
    });
  };

  const handleDeleteChatHistory = async () => {
    await deleteChatHistory.mutateAsync(user.user_id);
    setShowDeleteDialog(false);
    onChatDeleted?.();
  };

  const pendingChats = user.chats.filter((c) => c.status === "pending");

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
            <ChatMessage
              key={chat.id}
              chat={chat}
              userName={user.user_name}
              isReplying={replyingTo === chat.id}
              onReply={() => setReplyingTo(chat.id)}
              onAutoReply={() => handleAutoReply(chat)}
              isAutoReplying={autoReplyChat.isPending}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Input */}
      {replyingTo && (
        <div className="p-3 border-t bg-muted/30">
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={handleSendAnswer}
                disabled={!answer.trim() || answerChat.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyingTo(null);
                  setAnswer("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick action for pending */}
      {!replyingTo && pendingChats.length > 0 && (
        <div className="p-3 border-t flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setReplyingTo(pendingChats[0].id)}
          >
            <Send className="h-4 w-4 mr-2" />
            Reply manually
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleAutoReply(pendingChats[0])}
            disabled={autoReplyChat.isPending}
          >
            {autoReplyChat.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI Auto Reply
          </Button>
        </div>
      )}
    </>
  );
}

interface ChatMessageProps {
  chat: SupportChat;
  userName: string;
  isReplying: boolean;
  onReply: () => void;
  onAutoReply: () => void;
  isAutoReplying: boolean;
}

function ChatMessage({ chat, userName, isReplying, onReply, onAutoReply, isAutoReplying }: ChatMessageProps) {
  const isPending = chat.status === "pending";

  return (
    <div className="space-y-2">
      {/* User Question */}
      <div className="flex justify-start">
        <div
          className={cn(
            "max-w-[80%] rounded-lg p-3",
            "bg-muted"
          )}
        >
          <p className="whitespace-pre-wrap">{chat.question}</p>
          <div className="flex items-center justify-between mt-2 gap-2">
            <span className="text-xs text-muted-foreground">
              {format(new Date(chat.created_at), "MMM d, h:mm a")}
            </span>
            {isPending && !isReplying && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={onReply}>
                  Reply
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={onAutoReply}
                  disabled={isAutoReplying}
                  className="text-primary"
                >
                  {isAutoReplying ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Answer */}
      {chat.answer && (
        <div className="flex justify-end">
          <div
            className={cn(
              "max-w-[80%] rounded-lg p-3",
              "bg-primary text-primary-foreground"
            )}
          >
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
