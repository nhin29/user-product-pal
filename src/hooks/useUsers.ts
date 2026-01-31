import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_purchase: boolean;
  created_at: string;
  updated_at: string;
}

export function useUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_profiles_with_email");

      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "User deleted",
        description: "User has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserProfile = useMutation({
    mutationFn: async ({
      userId,
      displayName,
      email,
    }: {
      userId: string;
      displayName: string;
      email?: string;
    }) => {
      // Update profile display name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
        })
        .eq("user_id", userId);
      if (profileError) throw profileError;

      // If email changed, update via edge function
      if (email) {
        const { data, error: emailError } = await supabase.functions.invoke(
          "update-user-email",
          { body: { userId, newEmail: email } }
        );
        if (emailError) throw emailError;
        if (data?.error) throw new Error(data.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Profile updated",
        description: "User profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    users,
    isLoading,
    error,
    deleteUser,
    updateUserProfile,
  };
}
