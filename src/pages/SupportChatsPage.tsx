import { useState, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useSupportChats, UserConversation } from "@/hooks/useSupportChats";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";
import { UserChatList } from "@/components/support/UserChatList";
import { ChatConversation } from "@/components/support/ChatConversation";

export default function SupportChatsPage() {
  const { conversations, isLoading, markAsRead } = useSupportChats();
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [readConvos, setReadConvos] = useState<Set<string>>(new Set());

  const handleSelectConvo = (convo: UserConversation) => {
    setSelectedConvoId(convo.conversation_id);
    setReadConvos((prev) => new Set(prev).add(convo.conversation_id));
    markAsRead(convo.conversation_id);
  };

  // Compute conversations with overridden unread_count
  const conversationsWithReadState = conversations.map((convo) => ({
    ...convo,
    unread_count: readConvos.has(convo.conversation_id) ? 0 : convo.unread_count,
  }));

  // Reset read state when new messages arrive
  const prevUnreadRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const newRead = new Set(readConvos);
    let changed = false;
    conversations.forEach((convo) => {
      const prev = prevUnreadRef.current.get(convo.conversation_id) || 0;
      if (convo.unread_count > prev && readConvos.has(convo.conversation_id)) {
        newRead.delete(convo.conversation_id);
        changed = true;
      }
      prevUnreadRef.current.set(convo.conversation_id, convo.unread_count);
    });
    if (changed) setReadConvos(newRead);
  }, [conversations]);

  const selectedConvo = conversations.find((c) => c.conversation_id === selectedConvoId) || null;

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
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No support chats yet</p>
                </div>
              ) : (
                <UserChatList
                  conversations={conversationsWithReadState}
                  selectedConversationId={selectedConvoId}
                  onSelectConversation={handleSelectConvo}
                />
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className="lg:col-span-2 border rounded-lg overflow-hidden flex flex-col">
            {selectedConvo ? (
              <ChatConversation
                conversation={selectedConvo}
                onChatDeleted={() => setSelectedConvoId(null)}
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
