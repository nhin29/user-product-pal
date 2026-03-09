import { useState, useRef, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useSupportChats, UserConversation } from "@/hooks/useSupportChats";
import { useSupportFolders } from "@/hooks/useSupportFolders";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Search, X } from "lucide-react";
import { UserChatList } from "@/components/support/UserChatList";
import { ChatConversation } from "@/components/support/ChatConversation";
import { FolderTree } from "@/components/support/FolderTree";
import { Input } from "@/components/ui/input";

export default function SupportChatsPage() {
  const { conversations, isLoading, markAsRead } = useSupportChats();
  const { folders } = useSupportFolders();
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [readConvos, setReadConvos] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const handleSelectConvo = (convo: UserConversation) => {
    setSelectedConvoId(convo.conversation_id);
    setReadConvos((prev) => new Set(prev).add(convo.conversation_id));
    markAsRead(convo.conversation_id);
  };

  // Compute folder counts (including subfolder IDs)
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { inbox: 0 };
    const allFolderIds = new Set(folders.map((f) => f.id));
    // Get all descendant IDs for a folder
    const getDescendants = (parentId: string): string[] => {
      const children = folders.filter((f) => f.parent_id === parentId);
      return children.flatMap((c) => [c.id, ...getDescendants(c.id)]);
    };

    conversations.forEach((c) => {
      if (!c.folder_id || !allFolderIds.has(c.folder_id)) {
        counts["inbox"] = (counts["inbox"] || 0) + 1;
      }
    });

    folders.forEach((f) => {
      const ids = [f.id, ...getDescendants(f.id)];
      counts[f.id] = conversations.filter((c) => c.folder_id && ids.includes(c.folder_id)).length;
    });

    return counts;
  }, [conversations, folders]);

  // Filter conversations by selected folder
  const filteredConversations = useMemo(() => {
    if (selectedFolderId === null) {
      // Inbox: conversations with no folder, invalid folder, OR unread messages in any folder
      const allFolderIds = new Set(folders.map((f) => f.id));
      return conversations.filter(
        (c) => !c.folder_id || !allFolderIds.has(c.folder_id) || c.unread_count > 0
      );
    }
    // Include subfolder conversations
    const getDescendants = (parentId: string): string[] => {
      const children = folders.filter((f) => f.parent_id === parentId);
      return children.flatMap((c) => [c.id, ...getDescendants(c.id)]);
    };
    const ids = new Set([selectedFolderId, ...getDescendants(selectedFolderId)]);
    return conversations.filter((c) => c.folder_id && ids.has(c.folder_id));
  }, [conversations, folders, selectedFolderId]);

  // Apply search filter
  const searchedConversations = useMemo(() => {
    if (!searchQuery.trim()) return filteredConversations;
    const q = searchQuery.toLowerCase();
    return filteredConversations.filter(
      (c) =>
        c.user_name.toLowerCase().includes(q) ||
        c.user_email.toLowerCase().includes(q) ||
        (c.last_message_preview && c.last_message_preview.toLowerCase().includes(q))
    );
  }, [filteredConversations, searchQuery]);

  const conversationsWithReadState = searchedConversations.map((convo) => ({
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-220px)]">
          {/* Folder Sidebar */}
          <div className="lg:col-span-2 border rounded-lg overflow-hidden flex flex-col">
            <div className="p-3 border-b bg-muted/50">
              <h2 className="font-semibold text-sm">Folders</h2>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <FolderTree
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                folderCounts={folderCounts}
              />
            </div>
          </div>

          {/* User List */}
          <div className="lg:col-span-3 border rounded-lg overflow-hidden flex flex-col">
            <div className="p-3 border-b bg-muted/50 space-y-2">
              <h2 className="font-semibold text-sm">
                {selectedFolderId === null
                  ? "Inbox"
                  : folders.find((f) => f.id === selectedFolderId)?.name || "Folder"}
              </h2>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-8 text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
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
              ) : conversationsWithReadState.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">No conversations</p>
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
          <div className="lg:col-span-7 border rounded-lg overflow-hidden flex flex-col">
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
