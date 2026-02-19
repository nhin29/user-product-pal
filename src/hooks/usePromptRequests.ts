import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PromptRequest {
  id: string;
  user_id: string;
  product_id: string;
  access: boolean;
  created_at: string;
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
  product_image?: string;
  product_prompt?: string;
}

export function usePromptRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["prompt-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles and products
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const productIds = [...new Set(data.map((r) => r.product_id))];

      const [profilesRes, productsRes] = await Promise.all([
        supabase.rpc("get_profiles_with_email"),
        supabase.from("products").select("id, image_urls, prompt").in("id", productIds),
      ]);

      const profilesMap = new Map(
        (profilesRes.data || []).map((p: any) => [p.user_id, p])
      );
      const productsMap = new Map(
        (productsRes.data || []).map((p: any) => [p.id, p])
      );

      return data.map((r) => {
        const profile = profilesMap.get(r.user_id);
        const product = productsMap.get(r.product_id);
        return {
          ...r,
          user_name: profile?.display_name || "Unknown",
          user_email: profile?.email || "",
          user_avatar: profile?.avatar_url || "",
          product_image: product?.image_urls?.[0] || "",
          product_prompt: product?.prompt || "",
        } as PromptRequest;
      });
    },
  });

  const updateAccess = useMutation({
    mutationFn: async ({ id, access }: { id: string; access: boolean }) => {
      const { error } = await supabase
        .from("prompt_requests")
        .update({ access })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-requests"] });
      toast({ title: "Access updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("prompt_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-requests"] });
      toast({ title: "Request deleted" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return { requests, isLoading, updateAccess, deleteRequest };
}
