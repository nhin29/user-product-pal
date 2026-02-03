import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type ProductInsert = TablesInsert<"products">;
export type ProductUpdate = TablesUpdate<"products">;
export type ProductType = Tables<"product_types">;
export type Category = Tables<"categories">;

export interface PaginatedProducts {
  data: Product[];
  count: number;
}

export function useProducts(
  page: number = 1, 
  pageSize: number = 10, 
  search: string = "",
  categoryId: string = "",
  productTypeId: string = "",
  platform: string = ""
) {
  return useQuery({
    queryKey: ["products", page, pageSize, search, categoryId, productTypeId, platform],
    queryFn: async (): Promise<PaginatedProducts> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("products")
        .select("*, product_types(name, slug), categories(id, name, slug)", { count: "exact" });

      if (search) {
        query = query.or(`title.ilike.%${search}%,platform.ilike.%${search}%`);
      }

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      if (productTypeId) {
        query = query.eq("product_type_id", productTypeId);
      }

      if (platform) {
        query = query.eq("platform", platform);
      }

      const { data, error, count } = await query
        .order("display_order", { ascending: true })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
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

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProductUpdate }) => {
      const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id)
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

export function useDeleteProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useReorderProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      // Update each product's display_order
      const promises = updates.map(({ id, display_order }) =>
        supabase.from("products").update({ display_order }).eq("id", id)
      );
      
      const results = await Promise.all(promises);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
      return updates;
    },
    onMutate: async (updates) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["products"] });

      // Snapshot current queries
      const previousQueries = queryClient.getQueriesData({ queryKey: ["products"] });

      // Optimistically update all matching queries
      queryClient.setQueriesData({ queryKey: ["products"] }, (old: any) => {
        if (!old?.data) return old;
        
        const orderMap = new Map(updates.map(u => [u.id, u.display_order]));
        const updatedData = old.data.map((product: any) => ({
          ...product,
          display_order: orderMap.get(product.id) ?? product.display_order,
        }));
        
        // Sort by new display_order
        updatedData.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
        
        return { ...old, data: updatedData };
      });

      return { previousQueries };
    },
    onError: (_err, _updates, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
