import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SupportChat } from "@/hooks/useSupportChats";
import { User, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface ViewChatDialogProps {
  chat: SupportChat | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewChatDialog({
  chat,
  open,
  onOpenChange,
}: ViewChatDialogProps) {
  if (!chat) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Answered Support Chat
          </DialogTitle>
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
              {format(new Date(chat.created_at), "MMM d, yyyy")}
            </div>
          </div>

          {/* Question */}
          <div className="space-y-2">
            <Label>Question</Label>
            <div className="p-3 rounded-lg border bg-background">
              <p className="whitespace-pre-wrap">{chat.question}</p>
            </div>
          </div>

          {/* Answer */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Answer
              {chat.answered_at && (
                <span className="text-xs text-muted-foreground font-normal">
                  • {format(new Date(chat.answered_at), "MMM d, yyyy 'at' h:mm a")}
                </span>
              )}
            </Label>
            <div className="p-3 rounded-lg border bg-primary/5 border-primary/20">
              <p className="whitespace-pre-wrap">{chat.answer}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
