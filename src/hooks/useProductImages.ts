import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductImage {
  id: string;
  product_id: string;
  niche_id: string | null;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface ProductImageInput {
  image_url: string;
  niche_id: string | null;
  display_order: number;
}

export function useProductImages(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-images", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as ProductImage[];
    },
    enabled: !!productId,
  });
}

export function useSyncProductImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      images,
    }: {
      productId: string;
      images: ProductImageInput[];
    }) => {
      // Delete existing images for this product
      const { error: deleteError } = await supabase
        .from("product_images")
        .delete()
        .eq("product_id", productId);
      if (deleteError) throw deleteError;

      // Insert new images
      if (images.length > 0) {
        const rows = images.map((img, i) => ({
          product_id: productId,
          niche_id: img.niche_id,
          image_url: img.image_url,
          display_order: img.display_order ?? i,
        }));
        const { error: insertError } = await supabase
          .from("product_images")
          .insert(rows);
        if (insertError) throw insertError;
      }

      // Also sync image_urls array on the product for backward compatibility
      const { error: updateError } = await supabase
        .from("products")
        .update({ image_urls: images.map((img) => img.image_url) })
        .eq("id", productId);
      if (updateError) throw updateError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-images", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
