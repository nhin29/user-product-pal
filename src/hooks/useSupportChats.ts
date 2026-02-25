import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  created_at: string;
  read_at: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
}

export interface UserConversation {
  conversation_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  avatar_url: string | null;
  status: string;
  folder_id: string | null;
  messages: ChatMessage[];
  unread_count: number;
  last_message_at: string;
  last_seen: string | null;
}

export function useSupportChats() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: conversations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["support-conversations"],
    queryFn: async () => {
      // Fetch all conversations
      const { data: convos, error: convoError } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (convoError) throw convoError;
      if (!convos || convos.length === 0) return [];

      // Fetch all chats for these conversations
      const convoIds = convos.map((c) => c.id);
      const { data: allChats, error: chatsError } = await supabase
        .from("chats")
        .select("*")
        .in("conversation_id", convoIds)
        .order("created_at", { ascending: true });

      if (chatsError) throw chatsError;

      // Fetch user profiles
      const { data: profiles } = await supabase.rpc("get_profiles_with_email");
      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      // Fetch last seen from analytics_events in a single query
      const userIds = [...new Set(convos.map((c) => c.user_id))];
      const lastSeenMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: lastSeenData } = await supabase
          .from("analytics_events")
          .select("user_id, created_at")
          .in("user_id", userIds)
          .order("created_at", { ascending: false });
        
        // Take only the first (most recent) entry per user
        (lastSeenData || []).forEach((row) => {
          if (row.user_id && !lastSeenMap.has(row.user_id)) {
            lastSeenMap.set(row.user_id, row.created_at);
          }
        });
      }

      // Group chats by conversation
      const chatsByConvo = new Map<string, ChatMessage[]>();
      (allChats || []).forEach((chat) => {
        if (!chatsByConvo.has(chat.conversation_id)) {
          chatsByConvo.set(chat.conversation_id, []);
        }
        chatsByConvo.get(chat.conversation_id)!.push(chat);
      });

      return convos.map((convo): UserConversation => {
        const profile = profileMap.get(convo.user_id);
        const messages = chatsByConvo.get(convo.id) || [];
        
        // Count unread = user messages where read_at is null
        const unreadCount = messages.filter(
          (m) => m.sender_role === "user" && !m.read_at
        ).length;

        const lastMsg = messages[messages.length - 1];

        return {
          conversation_id: convo.id,
          user_id: convo.user_id,
          user_email: profile?.email || "Unknown",
          user_name: profile?.display_name || "Unknown User",
          avatar_url: profile?.avatar_url || null,
          status: convo.status,
          folder_id: convo.folder_id || null,
          messages,
          unread_count: unreadCount,
          last_message_at: lastMsg?.created_at || convo.created_at,
          last_seen: lastSeenMap.get(convo.user_id) || null,
        };
      }).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("support-chats-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const markAsRead = async (conversationId: string) => {
    const { error } = await supabase
      .from("chats")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("sender_role", "user")
      .is("read_at", null);
    if (error) console.error("Failed to mark messages as read:", error.message);
  };

  const sendMessage = useMutation({
    mutationFn: async ({
      conversationId,
      message,
      attachmentUrl,
      attachmentType,
      attachmentName,
    }: {
      conversationId: string;
      message: string;
      attachmentUrl?: string | null;
      attachmentType?: string | null;
      attachmentName?: string | null;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const { error } = await supabase.from("chats").insert({
        conversation_id: conversationId,
        sender_id: session.session.user.id,
        sender_role: "admin",
        message,
        attachment_url: attachmentUrl || null,
        attachment_type: attachmentType || null,
        attachment_name: attachmentName || null,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      // Delete chats first, then conversation
      const { error: chatsError } = await supabase
        .from("chats")
        .delete()
        .eq("conversation_id", conversationId);
      if (chatsError) throw chatsError;

      const { error: convoError } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);
      if (convoError) throw convoError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
      toast({
        title: "Chat history deleted",
        description: "All messages have been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting chat history",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    conversations,
    isLoading,
    error,
    sendMessage,
    deleteConversation,
    markAsRead,
  };
}
