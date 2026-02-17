import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Monitor, Smartphone, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { DeviceAnalyticsData } from "@/hooks/useDeviceAnalytics";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
];

interface DeviceAnalyticsChartProps {
  data?: DeviceAnalyticsData;
  isLoading: boolean;
}

export function DeviceAnalyticsChart({ data, isLoading }: DeviceAnalyticsChartProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data || data.totalSessions === 0) {
    return (
      <Card>
        <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
          No device session data available yet.
        </CardContent>
      </Card>
    );
  }

  const deviceConfig = Object.fromEntries(
    data.deviceTypes.map((d, i) => [
      d.name,
      { label: d.name, color: COLORS[i % COLORS.length] },
    ])
  );

  const browserConfig = Object.fromEntries(
    data.browsers.slice(0, 6).map((b, i) => [
      b.name,
      { label: b.name, color: COLORS[i % COLORS.length] },
    ])
  );

  const osConfig = Object.fromEntries(
    data.operatingSystems.slice(0, 6).map((o, i) => [
      o.name,
      { label: o.name, color: COLORS[i % COLORS.length] },
    ])
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Device Type Pie Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Device Types</CardTitle>
          </div>
          <CardDescription>
            {data.totalSessions} total sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={deviceConfig} className="h-[250px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie
                data={data.deviceTypes}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                paddingAngle={2}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {data.deviceTypes.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          {/* Legend */}
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {data.deviceTypes.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-sm">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Browser Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Browsers</CardTitle>
          </div>
          <CardDescription>Top browsers by usage</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={browserConfig} className="h-[250px] w-full">
            <BarChart
              data={data.browsers.slice(0, 6)}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                width={55}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" name="Sessions" radius={[0, 4, 4, 0]}>
                {data.browsers.slice(0, 6).map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* OS Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Operating Systems</CardTitle>
          </div>
          <CardDescription>Top OS by usage</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={osConfig} className="h-[250px] w-full">
            <BarChart
              data={data.operatingSystems.slice(0, 6)}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                width={55}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" name="Sessions" radius={[0, 4, 4, 0]}>
                {data.operatingSystems.slice(0, 6).map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
