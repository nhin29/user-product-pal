import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserAnalytics {
  totalClicks: number;
  totalCopies: number;
  totalSaves: number;
  totalPageViews: number;
  totalEvents: number;
}

interface ProductInteraction {
  id: string;
  image_url: string;
  clicks: number;
  copies: number;
  saves: number;
}


interface ActivityEvent {
  id: string;
  event_type: string;
  event_name: string;
  page_path: string | null;
  created_at: string;
}

export interface OnboardingResponse {
  niche: string[] | null;
  niche_other: string | null;
  primary_goal: string | null;
  design_goal: string | null;
  monthly_revenue: string | null;
  products_monthly: string | null;
  sales_channels: string | null;
  problems_before: string[] | null;
  why_peelkit: string | null;
  completed_at: string | null;
}

export function useUserAnalytics(userId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const statsQuery = useQuery({
    queryKey: ["user-analytics-stats", userId],
    queryFn: async (): Promise<UserAnalytics> => {
      const [
        { count: totalClicks },
        { count: totalCopies },
        { count: totalSaves },
        { count: totalPageViews },
        { count: totalEvents },
      ] = await Promise.all([
        supabase
          .from("prompt_interactions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("interaction_type", "click"),
        supabase
          .from("prompt_interactions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("interaction_type", "copy"),
        supabase
          .from("prompt_interactions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("interaction_type", "save"),
        supabase
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("event_type", "navigation"),
        supabase
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      return {
        totalClicks: totalClicks || 0,
        totalCopies: totalCopies || 0,
        totalSaves: totalSaves || 0,
        totalPageViews: totalPageViews || 0,
        totalEvents: totalEvents || 0,
      };
    },
    enabled: !!userId,
  });

  const productInteractionsQuery = useQuery({
    queryKey: ["user-product-interactions", userId],
    queryFn: async (): Promise<ProductInteraction[]> => {
      // Get all interactions for this user
      const { data: interactions, error } = await supabase
        .from("prompt_interactions")
        .select("product_id, interaction_type")
        .eq("user_id", userId);

      if (error) throw error;

      // Count interactions per product
      const productCounts: Record<string, { clicks: number; copies: number; saves: number }> = {};
      (interactions || []).forEach((i) => {
        if (!productCounts[i.product_id]) {
          productCounts[i.product_id] = { clicks: 0, copies: 0, saves: 0 };
        }
        if (i.interaction_type === "click") {
          productCounts[i.product_id].clicks++;
        } else if (i.interaction_type === "copy") {
          productCounts[i.product_id].copies++;
        } else if (i.interaction_type === "save") {
          productCounts[i.product_id].saves++;
        }
      });

      const productIds = Object.keys(productCounts);
      if (productIds.length === 0) return [];

      // Get product details
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, image_urls")
        .in("id", productIds);

      if (productsError) throw productsError;

      return (products || [])
        .map((p) => ({
          id: p.id,
          image_url: p.image_urls?.[0] || "",
          clicks: productCounts[p.id]?.clicks || 0,
          copies: productCounts[p.id]?.copies || 0,
          saves: productCounts[p.id]?.saves || 0,
        }))
        .sort((a, b) => b.clicks + b.copies + b.saves - (a.clicks + a.copies + a.saves));
    },
    enabled: !!userId,
  });

  const recentActivityQuery = useQuery({
    queryKey: ["user-recent-activity", userId],
    queryFn: async (): Promise<ActivityEvent[]> => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("id, event_type, event_name, page_path, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const onboardingQuery = useQuery({
    queryKey: ["user-onboarding-response", userId],
    queryFn: async (): Promise<OnboardingResponse | null> => {
      const { data, error } = await supabase
        .from("onboarding_responses")
        .select("niche, niche_other, primary_goal, design_goal, monthly_revenue, products_monthly, sales_channels, problems_before, why_peelkit, completed_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const clearAnalytics = useMutation({
    mutationFn: async () => {
      const [{ error: eventsError }, { error: interactionsError }] = await Promise.all([
        supabase.from("analytics_events").delete().eq("user_id", userId),
        supabase.from("prompt_interactions").delete().eq("user_id", userId),
      ]);
      if (eventsError) throw eventsError;
      if (interactionsError) throw interactionsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-analytics-stats", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-product-interactions", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-recent-activity", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-analytics-chart", userId] });
      toast({ title: "Analytics cleared", description: "All analytics data for this user has been deleted." });
    },
    onError: (error) => {
      toast({ title: "Error clearing analytics", description: error.message, variant: "destructive" });
    },
  });

  return {
    stats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,
    productInteractions: productInteractionsQuery.data || [],
    isLoadingProducts: productInteractionsQuery.isLoading,
    recentActivity: recentActivityQuery.data || [],
    isLoadingActivity: recentActivityQuery.isLoading,
    onboardingResponse: onboardingQuery.data,
    isLoadingOnboarding: onboardingQuery.isLoading,
    clearAnalytics,
  };
}
