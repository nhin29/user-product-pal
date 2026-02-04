import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSupportChats, SupportChat } from "@/hooks/useSupportChats";
import { Send, User } from "lucide-react";
import { format } from "date-fns";

interface AnswerChatDialogProps {
  chat: SupportChat | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnswerChatDialog({
  chat,
  open,
  onOpenChange,
}: AnswerChatDialogProps) {
  const [answer, setAnswer] = useState("");
  const { answerChat } = useSupportChats();

  const handleSubmit = async () => {
    if (!chat || !answer.trim()) return;

    await answerChat.mutateAsync({ chatId: chat.id, answer: answer.trim() });
    setAnswer("");
    onOpenChange(false);
  };

  if (!chat) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Answer Support Question</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{chat.user_name}</p>
              <p className="text-sm text-muted-foreground">{chat.user_email}</p>
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              {format(new Date(chat.created_at), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>

          {/* Question */}
          <div className="space-y-2">
            <Label>Question</Label>
            <div className="p-3 rounded-lg border bg-background">
              <p className="whitespace-pre-wrap">{chat.question}</p>
            </div>
          </div>

          {/* Answer input */}
          <div className="space-y-2">
            <Label htmlFor="answer">Your Answer</Label>
            <Textarea
              id="answer"
              placeholder="Type your answer here..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!answer.trim() || answerChat.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            {answerChat.isPending ? "Sending..." : "Send Answer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
