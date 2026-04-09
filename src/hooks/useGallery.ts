import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 40;

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

async function enrichImages(data: any[]): Promise<GalleryImage[]> {
  if (data.length === 0) return [];

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
}

export function useGallery() {
  const queryClient = useQueryClient();
  const [allImages, setAllImages] = useState<GalleryImage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Initial page load - fetch first PAGE_SIZE images
  const { isLoading } = useQuery({
    queryKey: ["gallery-images-initial"],
    queryFn: async () => {
      // Get total count
      const { count } = await supabase
        .from("generated_images")
        .select("*", { count: "exact", head: true });

      setTotalCount(count ?? 0);

      const { data, error } = await supabase
        .from("generated_images")
        .select("*")
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (error) throw error;

      const enriched = await enrichImages(data || []);
      setAllImages(enriched);
      setHasMore((data?.length ?? 0) >= PAGE_SIZE);
      return enriched;
    },
    staleTime: 30_000,
  });

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || allImages.length === 0) return;
    setIsLoadingMore(true);

    try {
      const lastImage = allImages[allImages.length - 1];
      const { data, error } = await supabase
        .from("generated_images")
        .select("*")
        .order("created_at", { ascending: false })
        .lt("created_at", lastImage.created_at)
        .limit(PAGE_SIZE);

      if (error) throw error;

      const enriched = await enrichImages(data || []);
      setAllImages((prev) => [...prev, ...enriched]);
      setHasMore((data?.length ?? 0) >= PAGE_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  }, [allImages, hasMore, isLoadingMore]);

  return { images: allImages, isLoading, isLoadingMore, hasMore, loadMore, totalCount };
}
