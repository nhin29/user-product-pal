import { Monitor, Smartphone, Tablet, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { DeviceData } from "@/hooks/useDeviceAnalytics";

const DEVICE_COLORS: Record<string, string> = {
  Desktop: "hsl(var(--chart-1))",
  Mobile: "hsl(var(--chart-2))",
  Tablet: "hsl(var(--chart-3))",
  Unknown: "hsl(var(--chart-4))",
};

const DEVICE_ICONS: Record<string, React.ElementType> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
};

interface DeviceChartProps {
  data: DeviceData[];
  isLoading: boolean;
  title?: string;
  description?: string;
}

export function DeviceChart({
  data,
  isLoading,
  title = "Device Breakdown",
  description = "Events by device type",
}: DeviceChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    fill: DEVICE_COLORS[d.device] || DEVICE_COLORS.Unknown,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Skeleton className="h-[180px] w-[180px] rounded-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <HelpCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No device data available</p>
            <p className="text-xs mt-1">Device tracking needs to be enabled in the client app</p>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div className="w-[180px] h-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="device"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    formatter={(value: number, name: string) => [`${value} events`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {data.map((item) => {
                const Icon = DEVICE_ICONS[item.device] || HelpCircle;
                const color = DEVICE_COLORS[item.device] || DEVICE_COLORS.Unknown;
                return (
                  <div key={item.device} className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{item.device}</span>
                        <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${item.percentage}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
