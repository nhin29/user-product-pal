import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useSupportChats, UserWithChats } from "@/hooks/useSupportChats";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";
import { UserChatList } from "@/components/support/UserChatList";
import { ChatConversation } from "@/components/support/ChatConversation";

export default function SupportChatsPage() {
  const { usersWithChats, isLoading, markAsRead } = useSupportChats();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleSelectUser = (user: UserWithChats) => {
    setSelectedUserId(user.user_id);
    if (user.pending_count > 0) {
      markAsRead(user.user_id);
    }
  };

  // Derive selected user from query data so it stays in sync with real-time updates
  const selectedUser = usersWithChats.find((u) => u.user_id === selectedUserId) || null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Chats</h1>
          <p className="text-muted-foreground">
            View and respond to user support questions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
          {/* User List */}
          <div className="lg:col-span-1 border rounded-lg overflow-hidden flex flex-col">
            <div className="p-3 border-b bg-muted/50">
              <h2 className="font-semibold">Users</h2>
            </div>
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : usersWithChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No support chats yet</p>
                </div>
              ) : (
                <UserChatList
                  users={usersWithChats}
                  selectedUserId={selectedUserId}
                  onSelectUser={handleSelectUser}
                />
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className="lg:col-span-2 border rounded-lg overflow-hidden flex flex-col">
            {selectedUser ? (
              <ChatConversation 
                user={selectedUser} 
                onChatDeleted={() => setSelectedUserId(null)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <MessageCircle className="h-16 w-16 text-muted-foreground mb-3" />
                <p className="text-lg font-medium text-muted-foreground">
                  Select a user to view conversation
                </p>
                <p className="text-sm text-muted-foreground">
                  Choose from the list on the left
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
