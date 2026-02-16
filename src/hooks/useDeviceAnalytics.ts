import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeviceData {
  device: string;
  count: number;
  percentage: number;
}

export function useDeviceAnalytics(userId?: string) {
  return useQuery({
    queryKey: ["device-analytics", userId ?? "all"],
    queryFn: async (): Promise<DeviceData[]> => {
      let query = supabase
        .from("user_sessions")
        .select("device_type");

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((row) => {
        const deviceType = row.device_type || "unknown";
        counts[deviceType] = (counts[deviceType] || 0) + 1;
      });

      const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
      if (total === 0) return [];

      return Object.entries(counts)
        .map(([device, count]) => ({
          device: device.charAt(0).toUpperCase() + device.slice(1),
          count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);
    },
  });
}
