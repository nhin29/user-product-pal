import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalCategories: number;
  totalProductTypes: number;
  totalClicks: number;
  totalCopies: number;
  totalSaves: number;
  totalGenerations: number;
  avgSpendTimeSeconds: number;
}

interface TopProduct {
  id: string;
  image_url: string;
  count: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase.rpc("get_dashboard_stats");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        totalUsers: Number(row?.total_users) || 0,
        totalProducts: Number(row?.total_products) || 0,
        totalCategories: Number(row?.total_categories) || 0,
        totalProductTypes: Number(row?.total_product_types) || 0,
        totalClicks: Number(row?.total_clicks) || 0,
        totalCopies: Number(row?.total_copies) || 0,
        totalSaves: Number(row?.total_saves) || 0,
        totalGenerations: Number(row?.total_generations) || 0,
        avgSpendTimeSeconds: Number(row?.avg_spend_time_seconds) || 0,
      };
    },
  });
}

function useTopProducts(interactionType: string, queryKey: string) {
  return useQuery({
    queryKey: [queryKey],
    queryFn: async (): Promise<TopProduct[]> => {
      const { data, error } = await supabase.rpc("get_top_products_by_interaction", {
        p_interaction_type: interactionType,
        p_limit: 5,
      });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.product_id,
        image_url: row.image_url || "",
        count: Number(row.interaction_count),
      }));
    },
  });
}

export function useTopClickedProducts() {
  return useTopProducts("click", "top-clicked-products");
}

export function useTopCopiedProducts() {
  return useTopProducts("copy", "top-copied-products");
}

export function useTopSavedProducts() {
  return useTopProducts("save", "top-saved-products");
}
