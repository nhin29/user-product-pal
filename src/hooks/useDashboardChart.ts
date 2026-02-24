import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";

interface ChartDataPoint {
  date: string;
  newCustomers: number;
  copies: number;
  saves: number;
  pageViews: number;
  generations: number;
}

function getDaysFromPeriod(period: string): number {
  switch (period) {
    case "7d": return 7;
    case "14d": return 14;
    case "30d": return 30;
    case "90d": return 90;
    default: return 7;
  }
}

export function useDashboardChart(period: string) {
  return useQuery({
    queryKey: ["dashboard-chart", period],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      const days = getDaysFromPeriod(period);
      const startDate = startOfDay(subDays(new Date(), days - 1));
      const endDate = new Date();

      const { data, error } = await supabase.rpc("get_dashboard_chart_data", {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
      });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        date: format(new Date(row.day), "MMM dd"),
        newCustomers: Number(row.new_customers),
        copies: Number(row.copies),
        saves: Number(row.saves),
        pageViews: Number(row.page_views),
        generations: Number(row.generations),
      }));
    },
  });
}
