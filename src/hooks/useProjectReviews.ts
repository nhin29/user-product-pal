import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export function useProjectReviews() {
  return useQuery({
    queryKey: ["project-reviews"],
    queryFn: async (): Promise<ProjectReview[]> => {
      const { data: reviews, error } = await supabase
        .from("project_reviews")
        .select("id, rating, comment, created_at, user_id")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!reviews || reviews.length === 0) return [];

      const userIds = [...new Set(reviews.map((r) => r.user_id).filter(Boolean))] as string[];

      let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        profiles?.forEach((p) => {
          profileMap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url });
        });
      }

      return reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        user_id: r.user_id,
        display_name: r.user_id ? profileMap.get(r.user_id)?.display_name ?? null : null,
        avatar_url: r.user_id ? profileMap.get(r.user_id)?.avatar_url ?? null : null,
      }));
    },
  });
}

export function useDeleteProjectReviews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("project_reviews")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-reviews"] });
    },
  });
}
