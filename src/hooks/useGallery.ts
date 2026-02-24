import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GalleryImage {
  id: string;
  image_url: string;
  created_at: string;
  user_id: string;
  product_id: string;
  completed_prompt: string | null;
  prompt_snapshot: string | null;
  analyzed_url: string | null;
  origin_image: string | null;
  field_values: any;
  user_name: string;
  user_email: string;
  user_avatar: string;
  product_image: string;
  rating: number | null;
  product_prompt: string;
}

export function useGallery() {
  const { data: images = [], isLoading } = useQuery({
    queryKey: ["gallery-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_images")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(data.map((img) => img.user_id))];
      const productIds = [...new Set(data.map((img) => img.product_id))];
      const imageIds = data.map((img) => img.id);

      const [profilesRes, productsRes, reviewsRes] = await Promise.all([
        supabase.rpc("get_profiles_with_email"),
        supabase.from("products").select("id, image_urls, prompt").in("id", productIds),
        supabase.from("reviews").select("generated_image_id, rating").in("generated_image_id", imageIds),
      ]);

      const profilesMap = new Map(
        (profilesRes.data || []).map((p: any) => [p.user_id, p])
      );
      const productsMap = new Map(
        (productsRes.data || []).map((p: any) => [p.id, p])
      );
      const reviewsMap = new Map(
        (reviewsRes.data || []).map((r: any) => [r.generated_image_id, r.rating])
      );

      return data.map((img) => {
        const profile = profilesMap.get(img.user_id);
        const product = productsMap.get(img.product_id);
        return {
          ...img,
          user_name: profile?.display_name || "Unknown",
          user_email: profile?.email || "",
          user_avatar: profile?.avatar_url || "",
          product_image: product?.image_urls?.[0] || "",
          product_prompt: product?.prompt || "",
          rating: reviewsMap.get(img.id) ?? null,
        } as GalleryImage;
      });
    },
  });

  return { images, isLoading };
}
