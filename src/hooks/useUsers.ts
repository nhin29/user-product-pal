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
      // Subscription product mapping
      const SUBSCRIPTION_CREDIT_MAP: Record<string, number> = {
        "prod_U3DJqmft6ONyxk": 100,   // monthly — 100/mo
        "prod_U4sQ5jX7kNnc14": 100,   // quarterly — 100/mo
        "prod_U4sSoxZsz5Ix9Z": 100,   // yearly — 100/mo
      };
      const SUBSCRIPTION_IDS = Object.keys(SUBSCRIPTION_CREDIT_MAP);

      // One-time credit package mapping
      const ONETIME_CREDIT_MAP: Record<string, number> = {
        "prod_UAkro7xtZ7WWVV": 30,
        "prod_UAktSMnUZSNut0": 100,
      };
      const ONETIME_IDS = Object.keys(ONETIME_CREDIT_MAP);

      // Build update object
      const updateData: { display_name: string; product_ids?: string[]; is_analytics?: boolean; is_refund?: boolean } = {
        display_name: displayName,
      };
      
      if (isAnalytics !== undefined) {
        updateData.is_analytics = isAnalytics;
      }
      
      if (isRefund !== undefined) {
        updateData.is_refund = isRefund;
        if (isRefund) {
          updateData.product_ids = [];
          productIds = [];
        }
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

      // Handle subscription products
      if (productIds !== undefined) {
        const selectedSub = productIds.find((id) => SUBSCRIPTION_IDS.includes(id));
        const selectedOnetime = productIds.find((id) => ONETIME_IDS.includes(id));

        if (selectedSub) {
          // Upsert subscription
          const { error: subError } = await supabase
            .from("user_subscriptions")
            .upsert(
              {
                user_id: userId,
                stripe_subscription_id: `manual_${userId}`,
                product_id: selectedSub,
                status: "active",
                current_period_start: new Date().toISOString(),
              },
              { onConflict: "stripe_subscription_id" }
            );
          if (subError) throw subError;

          // Update credits
          const newLimit = SUBSCRIPTION_CREDIT_MAP[selectedSub];
          const { error: creditError } = await supabase
            .from("user_credits")
            .upsert(
              { user_id: userId, credit_limit: newLimit, used_count: 0, status: "subscribed" },
              { onConflict: "user_id" }
            );
          if (creditError) throw creditError;
        } else if (selectedOnetime) {
          // One-time credit package selected
          const newLimit = ONETIME_CREDIT_MAP[selectedOnetime];
          const { error: creditError } = await supabase
            .from("user_credits")
            .upsert(
              { user_id: userId, credit_limit: newLimit, used_count: 0, status: "one_time" },
              { onConflict: "user_id" }
            );
          if (creditError) throw creditError;

          // Cancel any active subscription
          const { data: existingSub } = await supabase
            .from("user_subscriptions")
            .select("id, status")
            .eq("user_id", userId)
            .eq("status", "active")
            .maybeSingle();

          if (existingSub) {
            const { error: cancelError } = await supabase
              .from("user_subscriptions")
              .update({ status: "canceled", canceled_at: new Date().toISOString() })
              .eq("id", existingSub.id);
            if (cancelError) throw cancelError;
          }
        } else {
          // No subscription or one-time selected — check if user previously had one
          const { data: existingSub } = await supabase
            .from("user_subscriptions")
            .select("id, status")
            .eq("user_id", userId)
            .eq("status", "active")
            .maybeSingle();

          if (existingSub) {
            // Cancel subscription
            const { error: cancelError } = await supabase
              .from("user_subscriptions")
              .update({ status: "canceled", canceled_at: new Date().toISOString() })
              .eq("id", existingSub.id);
            if (cancelError) throw cancelError;

            // Revert credits
            const { error: creditError } = await supabase
              .from("user_credits")
              .upsert(
                { user_id: userId, credit_limit: creditLimit ?? 4, status: "trial" },
                { onConflict: "user_id" }
              );
            if (creditError) throw creditError;
          }
        }

        // Handle stripe_subscribers sync for non-subscription products
        const currentUser = queryClient.getQueryData<UserProfile[]>(["users"])
          ?.find((u) => u.user_id === userId);

        if (currentUser && !currentUser.is_purchase) {
          const userEmail = email || currentUser.email;
          const nonSubProductIds = productIds.filter((id) => !SUBSCRIPTION_IDS.includes(id));
          if (userEmail) {
            if (nonSubProductIds.length > 0) {
              const { error: subError } = await supabase
                .from("stripe_subscribers")
                .upsert({ email: userEmail }, { onConflict: "email" });
              if (subError) throw subError;
            } else if (!selectedSub) {
              const { error: subError } = await supabase
                .from("stripe_subscribers")
                .delete()
                .eq("email", userEmail);
              if (subError) throw subError;
            }
          }
        }
      }

      // Update credit limit if manually changed (and no subscription override)
      if (creditLimit !== undefined && productIds !== undefined) {
        const selectedSub = productIds.find((id) => SUBSCRIPTION_IDS.includes(id));
        if (!selectedSub) {
          const { error: creditError } = await supabase
            .from("user_credits")
            .upsert(
              { user_id: userId, credit_limit: creditLimit },
              { onConflict: "user_id" }
            );
          if (creditError) throw creditError;
        }
      } else if (creditLimit !== undefined) {
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
