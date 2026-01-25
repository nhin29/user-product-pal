import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type ProductInsert = TablesInsert<"products">;
export type ProductType = Tables<"product_types">;
export type Category = Tables<"categories">;

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_types(name, slug), categories(id, name, slug)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useProductTypes() {
  return useQuery({
    queryKey: ["product_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_types")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: ProductInsert) => {
      const { data, error } = await supabase
        .from("products")
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
