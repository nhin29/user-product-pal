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
  
  product_ids: string[] | null;
  created_at: string;
  updated_at: string;
  role: string | null;
  is_analytics: boolean;
  is_refund: boolean;
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
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
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
      productIds,
      role,
      isAnalytics,
      isRefund,
      
      creditLimit,
    }: {
      userId: string;
      displayName: string;
      email?: string;
      productIds?: string[];
      role?: string;
      isAnalytics?: boolean;
      isRefund?: boolean;
      
      creditLimit?: number;
    }) => {
      // Build update object
      const updateData: { display_name: string; product_ids?: string[]; is_analytics?: boolean; is_refund?: boolean } = {
        display_name: displayName,
      };
      
      if (isAnalytics !== undefined) {
        updateData.is_analytics = isAnalytics;
      }
      
      if (isRefund !== undefined) {
        updateData.is_refund = isRefund;
      }

      
      if (productIds !== undefined) {
        updateData.product_ids = productIds;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update(updateData)
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

      // If role changed, upsert in user_roles table
      if (role) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert(
            { user_id: userId, role: role as "admin" | "editor" | "viewer" },
            { onConflict: "user_id" }
          );
        if (roleError) throw roleError;
      }

      if (productIds !== undefined) {
        const currentUser = queryClient.getQueryData<UserProfile[]>(["users"])
          ?.find((u) => u.user_id === userId);

        if (currentUser && !currentUser.is_purchase) {
          const userEmail = email || currentUser.email;
          if (userEmail) {
            if (productIds.length > 0) {
              const { error: subError } = await supabase
                .from("stripe_subscribers")
                .upsert({ email: userEmail }, { onConflict: "email" });
              if (subError) throw subError;
            } else {
              const { error: subError } = await supabase
                .from("stripe_subscribers")
                .delete()
                .eq("email", userEmail);
              if (subError) throw subError;
            }
          }
        }
      }

      // Update credit limit if changed
      if (creditLimit !== undefined) {
        const { error: creditError } = await supabase
          .from("user_credits")
          .upsert(
            { user_id: userId, credit_limit: creditLimit },
            { onConflict: "user_id" }
          );
        if (creditError) throw creditError;
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

  const createUser = useMutation({
    mutationFn: async ({ email, password, displayName }: { email: string; password: string; displayName: string }) => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email, password, displayName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "User created",
        description: "New user has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating user",
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
    createUser,
  };
}
