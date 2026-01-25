import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ProductType = Tables<"product_types">;
export type ProductTypeInsert = TablesInsert<"product_types">;
export type ProductTypeUpdate = TablesUpdate<"product_types">;

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

export function useCreateProductType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productType: ProductTypeInsert) => {
      const { data, error } = await supabase
        .from("product_types")
        .insert(productType)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_types"] });
    },
  });
}

export function useUpdateProductType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProductTypeUpdate }) => {
      const { data, error } = await supabase
        .from("product_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_types"] });
    },
  });
}

export function useDeleteProductType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_types"] });
    },
  });
}
