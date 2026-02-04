import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useSupportChats, SupportChat } from "@/hooks/useSupportChats";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Send } from "lucide-react";
import { format } from "date-fns";
import { AnswerChatDialog } from "@/components/support/AnswerChatDialog";
import { ViewChatDialog } from "@/components/support/ViewChatDialog";

export default function SupportChatsPage() {
  const { chats, isLoading } = useSupportChats();
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null);
  const [isAnswerOpen, setIsAnswerOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const handleAnswer = (chat: SupportChat) => {
    setSelectedChat(chat);
    setIsAnswerOpen(true);
  };

  const handleView = (chat: SupportChat) => {
    setSelectedChat(chat);
    setIsViewOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "answered":
        return <Badge variant="default">Answered</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Support Chats</h1>
            <p className="text-muted-foreground">
              View and respond to user support questions
            </p>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : chats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No support chats yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                chats.map((chat) => (
                  <TableRow key={chat.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{chat.user_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {chat.user_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate">{chat.question}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(chat.status)}</TableCell>
                    <TableCell>
                      {format(new Date(chat.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {chat.status === "answered" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(chat)}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAnswer(chat)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Answer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AnswerChatDialog
        chat={selectedChat}
        open={isAnswerOpen}
        onOpenChange={setIsAnswerOpen}
      />

      <ViewChatDialog
        chat={selectedChat}
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
      />
    </AdminLayout>
  );
}
