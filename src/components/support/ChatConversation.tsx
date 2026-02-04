import { useState, useRef, useEffect } from "react";
import { UserWithChats, useSupportChats, SupportChat } from "@/hooks/useSupportChats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ChatConversationProps {
  user: UserWithChats;
}

export function ChatConversation({ user }: ChatConversationProps) {
  const { answerChat } = useSupportChats();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when conversation changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [user.chats]);

  const handleSendAnswer = async () => {
    if (!replyingTo || !answer.trim()) return;

    await answerChat.mutateAsync({ chatId: replyingTo, answer: answer.trim() });
    setAnswer("");
    setReplyingTo(null);
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
        <div>
          <p className="font-semibold">{user.user_name}</p>
          <p className="text-sm text-muted-foreground">{user.user_email}</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {user.chats.map((chat) => (
            <ChatMessage
              key={chat.id}
              chat={chat}
              isReplying={replyingTo === chat.id}
              onReply={() => setReplyingTo(chat.id)}
            />
          ))}
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
        <div className="p-3 border-t">
          <Button
            className="w-full"
            onClick={() => setReplyingTo(pendingChats[0].id)}
          >
            <Send className="h-4 w-4 mr-2" />
            Reply to oldest pending question
          </Button>
        </div>
      )}
    </>
  );
}

interface ChatMessageProps {
  chat: SupportChat;
  isReplying: boolean;
  onReply: () => void;
}

function ChatMessage({ chat, isReplying, onReply }: ChatMessageProps) {
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
          <div className="flex items-center justify-between mt-2 gap-4">
            <span className="text-xs text-muted-foreground">
              {format(new Date(chat.created_at), "MMM d, h:mm a")}
            </span>
            {isPending && !isReplying && (
              <Button size="sm" variant="ghost" onClick={onReply}>
                Reply
              </Button>
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
