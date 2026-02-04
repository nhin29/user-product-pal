import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

  return {
    usersWithChats,
    isLoading,
    error,
    answerChat,
  };
}
