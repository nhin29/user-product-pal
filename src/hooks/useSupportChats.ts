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
  unread_count: number;
  last_message_at: string;
  last_seen: string | null;
  last_message_preview: string | null;
}

export function useSupportChats() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversation list (lightweight — no full messages)
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

      // Fetch only last message + unread count per conversation (not all messages)
      const convoIds = convos.map((c) => c.id);
      const { data: allChats, error: chatsError } = await supabase
        .from("chats")
        .select("conversation_id, sender_role, read_at, created_at, message")
        .in("conversation_id", convoIds)
        .order("created_at", { ascending: false });

      if (chatsError) throw chatsError;

      // Build per-conversation summary
      const convoSummary = new Map<string, { unread_count: number; last_message_at: string; last_message_preview: string | null }>();
      (allChats || []).forEach((chat) => {
        const existing = convoSummary.get(chat.conversation_id);
        if (!existing) {
          convoSummary.set(chat.conversation_id, {
            unread_count: chat.sender_role === "user" && !chat.read_at ? 1 : 0,
            last_message_at: chat.created_at,
            last_message_preview: chat.message?.substring(0, 100) || null,
          });
        } else {
          if (chat.sender_role === "user" && !chat.read_at) {
            existing.unread_count++;
          }
        }
      });

      // Fetch user profiles (shared query key with useUsers)
      const { data: profiles } = await supabase.rpc("get_profiles_with_email");
      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      // Fetch last seen via RPC
      const userIds = [...new Set(convos.map((c) => c.user_id))];
      const lastSeenMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: lastSeenData } = await supabase.rpc("get_last_seen_by_users", {
          p_user_ids: userIds,
        });
        (lastSeenData || []).forEach((row: any) => {
          lastSeenMap.set(row.user_id, row.last_seen);
        });
      }

      return convos.map((convo): UserConversation => {
        const profile = profileMap.get(convo.user_id);
        const summary = convoSummary.get(convo.id);

        return {
          conversation_id: convo.id,
          user_id: convo.user_id,
          user_email: profile?.email || "Unknown",
          user_name: profile?.display_name || "Unknown User",
          avatar_url: profile?.avatar_url || null,
          status: convo.status,
          folder_id: convo.folder_id || null,
          unread_count: summary?.unread_count || 0,
          last_message_at: summary?.last_message_at || convo.created_at,
          last_seen: lastSeenMap.get(convo.user_id) || null,
          last_message_preview: summary?.last_message_preview || null,
        };
      }).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
    staleTime: 30 * 1000,
  });

  // Fetch messages for a specific conversation (lazy-loaded)
  function useConversationMessages(conversationId: string | null) {
    return useQuery({
      queryKey: ["conversation-messages", conversationId],
      queryFn: async (): Promise<ChatMessage[]> => {
        if (!conversationId) return [];
        const { data, error } = await supabase
          .from("chats")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return data || [];
      },
      enabled: !!conversationId,
      staleTime: 10 * 1000,
    });
  }

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("support-chats-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats" },
        (payload: any) => {
          // Invalidate the specific conversation messages
          const convoId = payload.new?.conversation_id || payload.old?.conversation_id;
          if (convoId) {
            queryClient.invalidateQueries({ queryKey: ["conversation-messages", convoId] });
          }
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", variables.conversationId] });
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
    useConversationMessages,
  };
}
