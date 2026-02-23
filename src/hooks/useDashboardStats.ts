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
      const [
        { count: totalUsers },
        { count: totalProducts },
        { count: totalCategories },
        { count: totalProductTypes },
        { count: totalClicks },
        { count: totalCopies },
        { count: totalSaves },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("product_types").select("*", { count: "exact", head: true }),
        supabase.from("prompt_interactions").select("*", { count: "exact", head: true }).eq("interaction_type", "click"),
        supabase.from("prompt_interactions").select("*", { count: "exact", head: true }).eq("interaction_type", "copy"),
        supabase.from("prompt_interactions").select("*", { count: "exact", head: true }).eq("interaction_type", "save"),
      ]);

      return {
        totalUsers: totalUsers || 0,
        totalProducts: totalProducts || 0,
        totalCategories: totalCategories || 0,
        totalProductTypes: totalProductTypes || 0,
        totalClicks: totalClicks || 0,
        totalCopies: totalCopies || 0,
        totalSaves: totalSaves || 0,
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
