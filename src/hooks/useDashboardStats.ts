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

export function useTopClickedProducts() {
  return useQuery({
    queryKey: ["top-clicked-products"],
    queryFn: async (): Promise<TopProduct[]> => {
      const { data: interactions, error: interactionsError } = await supabase
        .from("prompt_interactions")
        .select("product_id")
        .eq("interaction_type", "click");

      if (interactionsError) throw interactionsError;

      const clickCounts: Record<string, number> = {};
      (interactions || []).forEach((i) => {
        clickCounts[i.product_id] = (clickCounts[i.product_id] || 0) + 1;
      });

      const productIds = Object.keys(clickCounts);
      if (productIds.length === 0) return [];

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, image_urls")
        .in("id", productIds);

      if (productsError) throw productsError;

      return (products || [])
        .map((p) => ({
          id: p.id,
          image_url: p.image_urls?.[0] || "",
          count: clickCounts[p.id] || 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
  });
}

export function useTopCopiedProducts() {
  return useQuery({
    queryKey: ["top-copied-products"],
    queryFn: async (): Promise<TopProduct[]> => {
      const { data: interactions, error: interactionsError } = await supabase
        .from("prompt_interactions")
        .select("product_id")
        .eq("interaction_type", "copy");

      if (interactionsError) throw interactionsError;

      const copyCounts: Record<string, number> = {};
      (interactions || []).forEach((i) => {
        copyCounts[i.product_id] = (copyCounts[i.product_id] || 0) + 1;
      });

      const productIds = Object.keys(copyCounts);
      if (productIds.length === 0) return [];

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, image_urls")
        .in("id", productIds);

      if (productsError) throw productsError;

      return (products || [])
        .map((p) => ({
          id: p.id,
          image_url: p.image_urls?.[0] || "",
          count: copyCounts[p.id] || 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
  });
}

export function useTopSavedProducts() {
  return useQuery({
    queryKey: ["top-saved-products"],
    queryFn: async (): Promise<TopProduct[]> => {
      const { data: interactions, error: interactionsError } = await supabase
        .from("prompt_interactions")
        .select("product_id")
        .eq("interaction_type", "save");

      if (interactionsError) throw interactionsError;

      const saveCounts: Record<string, number> = {};
      (interactions || []).forEach((i) => {
        saveCounts[i.product_id] = (saveCounts[i.product_id] || 0) + 1;
      });

      const productIds = Object.keys(saveCounts);
      if (productIds.length === 0) return [];

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, image_urls")
        .in("id", productIds);

      if (productsError) throw productsError;

      return (products || [])
        .map((p) => ({
          id: p.id,
          image_url: p.image_urls?.[0] || "",
          count: saveCounts[p.id] || 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
  });
}
