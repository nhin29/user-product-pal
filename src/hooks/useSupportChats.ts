import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SupportChat {
  id: string;
  user_id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  answered_by: string | null;
  status: string;
  created_at: string;
}

export interface UserWithChats {
  user_id: string;
  user_email: string;
  user_name: string;
  avatar_url: string | null;
  chats: SupportChat[];
  pending_count: number;
  last_message_at: string;
  last_seen: string | null;
}

export function useSupportChats() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: usersWithChats = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["support-chats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_chats")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch user info
      const userIds = [...new Set(data.map((chat) => chat.user_id))];
      const { data: profiles } = await supabase.rpc("get_profiles_with_email");

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      // Fetch last seen from analytics_events
      const lastSeenMap = new Map<string, string>();
      for (const uid of userIds) {
        const { data: events } = await supabase
          .from("analytics_events")
          .select("created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(1);
        if (events && events.length > 0) {
          lastSeenMap.set(uid, events[0].created_at);
        }
      }

      // Group chats by user
      const userChatsMap = new Map<string, UserWithChats>();

      data.forEach((chat) => {
        const profile = profileMap.get(chat.user_id);
        
        if (!userChatsMap.has(chat.user_id)) {
          userChatsMap.set(chat.user_id, {
            user_id: chat.user_id,
            user_email: profile?.email || "Unknown",
            user_name: profile?.display_name || "Unknown User",
            avatar_url: profile?.avatar_url || null,
            chats: [],
            pending_count: 0,
            last_message_at: chat.created_at,
            last_seen: lastSeenMap.get(chat.user_id) || null,
          });
        }

        const userChats = userChatsMap.get(chat.user_id)!;
        userChats.chats.push(chat);
        
        if (chat.status === "pending") {
          userChats.pending_count++;
        }
        
        // Update last message time
        if (new Date(chat.created_at) > new Date(userChats.last_message_at)) {
          userChats.last_message_at = chat.created_at;
        }
      });

      // Sort by last message (most recent first)
      return Array.from(userChatsMap.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
  });

  // Real-time subscription for auto-replies
  useEffect(() => {
    const channel = supabase
      .channel("support-chats-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_chats" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["support-chats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const answerChat = useMutation({
    mutationFn: async ({
      chatId,
      answer,
    }: {
      chatId: string;
      answer: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("support_chats")
        .update({
          answer,
          answered_at: new Date().toISOString(),
          answered_by: session.session.user.id,
          status: "answered",
        })
        .eq("id", chatId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-chats"] });
      toast({
        title: "Answer sent",
        description: "Your response has been sent to the user.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error sending answer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const autoReplyChat = useMutation({
    mutationFn: async ({
      chatId,
      question,
      userName,
    }: {
      chatId: string;
      question: string;
      userName: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      // Call AI to generate response
      const { data, error: fnError } = await supabase.functions.invoke(
        "auto-reply-support",
        { body: { question, userName } }
      );

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const aiAnswer = data.answer;

      // Save the answer
      const { error } = await supabase
        .from("support_chats")
        .update({
          answer: aiAnswer,
          answered_at: new Date().toISOString(),
          answered_by: session.session.user.id,
          status: "answered",
        })
        .eq("id", chatId);

      if (error) throw error;

      return aiAnswer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-chats"] });
      toast({
        title: "AI reply sent",
        description: "The AI has automatically responded to the user.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error with AI reply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteChatHistory = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("support_chats")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-chats"] });
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

  const sendAdminMessage = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const { error } = await supabase.from("support_chats").insert({
        user_id: userId,
        question: "",
        answer: message,
        answered_at: new Date().toISOString(),
        answered_by: session.session.user.id,
        status: "answered",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-chats"] });
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    usersWithChats,
    isLoading,
    error,
    answerChat,
    autoReplyChat,
    deleteChatHistory,
    sendAdminMessage,
  };
}
