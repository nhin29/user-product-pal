import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalCategories: number;
  totalProductTypes: number;
  totalEvents: number;
  totalInteractions: number;
  pageViews: number;
  promptCopies: number;
}

interface RecentActivity {
  id: string;
  user: string;
  action: string;
  time: string;
  eventType: string;
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
        { count: totalEvents },
        { count: totalInteractions },
        { count: pageViews },
        { count: promptCopies },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("product_types").select("*", { count: "exact", head: true }),
        supabase.from("analytics_events").select("*", { count: "exact", head: true }),
        supabase.from("prompt_interactions").select("*", { count: "exact", head: true }),
        supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_name", "page_view"),
        supabase.from("prompt_interactions").select("*", { count: "exact", head: true }).eq("interaction_type", "copy"),
      ]);

      return {
        totalUsers: totalUsers || 0,
        totalProducts: totalProducts || 0,
        totalCategories: totalCategories || 0,
        totalProductTypes: totalProductTypes || 0,
        totalEvents: totalEvents || 0,
        totalInteractions: totalInteractions || 0,
        pageViews: pageViews || 0,
        promptCopies: promptCopies || 0,
      };
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ["recent-activity"],
    queryFn: async (): Promise<RecentActivity[]> => {
      const { data: events, error } = await supabase
        .from("analytics_events")
        .select("id, event_name, event_type, page_path, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      return (events || []).map((event) => {
        const getActionText = () => {
          switch (event.event_name) {
            case "page_view":
              return `Viewed ${event.page_path || "a page"}`;
            case "prompt_click":
              return "Clicked on a prompt";
            case "prompt_copy":
              return "Copied a prompt";
            case "click":
              return "Interacted with UI";
            default:
              return event.event_name;
          }
        };

        const getTimeAgo = (dateStr: string) => {
          const date = new Date(dateStr);
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHours / 24);

          if (diffMins < 1) return "Just now";
          if (diffMins < 60) return `${diffMins} min ago`;
          if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
          return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        };

        return {
          id: event.id,
          user: event.user_id ? `User ${event.user_id.slice(0, 8)}...` : "Anonymous",
          action: getActionText(),
          time: getTimeAgo(event.created_at),
          eventType: event.event_type,
        };
      });
    },
  });
}
