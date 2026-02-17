import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DeviceTypeData {
  name: string;
  value: number;
}

interface BrowserData {
  name: string;
  value: number;
}

interface OSData {
  name: string;
  value: number;
}

export interface DeviceAnalyticsData {
  deviceTypes: DeviceTypeData[];
  browsers: BrowserData[];
  operatingSystems: OSData[];
  totalSessions: number;
}

export function useDeviceAnalytics() {
  return useQuery({
    queryKey: ["device-analytics"],
    queryFn: async (): Promise<DeviceAnalyticsData> => {
      const { data, error } = await supabase
        .from("device_sessions")
        .select("device_type, browser, os");

      if (error) throw error;

      const deviceMap: Record<string, number> = {};
      const browserMap: Record<string, number> = {};
      const osMap: Record<string, number> = {};

      (data || []).forEach((session) => {
        const device = session.device_type || "Unknown";
        deviceMap[device] = (deviceMap[device] || 0) + 1;

        const browser = session.browser || "Unknown";
        browserMap[browser] = (browserMap[browser] || 0) + 1;

        const os = session.os || "Unknown";
        osMap[os] = (osMap[os] || 0) + 1;
      });

      const toSorted = (map: Record<string, number>) =>
        Object.entries(map)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

      return {
        deviceTypes: toSorted(deviceMap),
        browsers: toSorted(browserMap),
        operatingSystems: toSorted(osMap),
        totalSessions: data?.length || 0,
      };
    },
  });
}
