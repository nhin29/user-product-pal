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
  user_email?: string;
  user_name?: string;
}

export function useSupportChats() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: chats = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["support-chats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_chats")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user info for each chat
      const userIds = [...new Set(data.map((chat) => chat.user_id))];
      const { data: profiles } = await supabase
        .rpc("get_profiles_with_email")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return data.map((chat) => {
        const profile = profileMap.get(chat.user_id);
        return {
          ...chat,
          user_email: profile?.email || "Unknown",
          user_name: profile?.display_name || "Unknown User",
        };
      }) as SupportChat[];
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
    chats,
    isLoading,
    error,
    answerChat,
  };
}
