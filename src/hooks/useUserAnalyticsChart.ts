import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface ChartDataPoint {
  date: string;
  clicks: number;
  copies: number;
  pageViews: number;
  events: number;
}

function getDaysFromPeriod(period: string): number {
  switch (period) {
    case "7d":
      return 7;
    case "14d":
      return 14;
    case "30d":
      return 30;
    case "90d":
      return 90;
    default:
      return 7;
  }
}

export function useUserAnalyticsChart(userId: string, period: string) {
  return useQuery({
    queryKey: ["user-analytics-chart", userId, period],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      const days = getDaysFromPeriod(period);
      const startDate = startOfDay(subDays(new Date(), days - 1));
      const endDate = new Date();

      // Fetch prompt interactions (clicks and copies)
      const { data: interactions, error: interactionsError } = await supabase
        .from("prompt_interactions")
        .select("interaction_type, created_at")
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (interactionsError) throw interactionsError;

      // Fetch analytics events
      const { data: events, error: eventsError } = await supabase
        .from("analytics_events")
        .select("event_type, created_at")
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (eventsError) throw eventsError;

      // Create a map for each day in the range
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      const dataMap: Record<string, ChartDataPoint> = {};

      dateRange.forEach((date) => {
        const dateKey = format(date, "MMM dd");
        dataMap[dateKey] = {
          date: dateKey,
          clicks: 0,
          copies: 0,
          pageViews: 0,
          events: 0,
        };
      });

      // Aggregate interactions
      (interactions || []).forEach((i) => {
        const dateKey = format(new Date(i.created_at), "MMM dd");
        if (dataMap[dateKey]) {
          if (i.interaction_type === "click") {
            dataMap[dateKey].clicks++;
          } else if (i.interaction_type === "copy") {
            dataMap[dateKey].copies++;
          }
        }
      });

      // Aggregate events
      (events || []).forEach((e) => {
        const dateKey = format(new Date(e.created_at), "MMM dd");
        if (dataMap[dateKey]) {
          dataMap[dateKey].events++;
          if (e.event_type === "pageview" || e.event_type === "navigation") {
            dataMap[dateKey].pageViews++;
          }
        }
      });

      return dateRange.map((date) => dataMap[format(date, "MMM dd")]);
    },
    enabled: !!userId,
  });
}
