import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { CalendarIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ChartDataPoint {
  date: string;
  clicks: number;
  copies: number;
  pageViews: number;
  events: number;
}

interface ActivityChartProps {
  data: ChartDataPoint[];
  isLoading: boolean;
  period: string;
  onPeriodChange: (period: string) => void;
}

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "hsl(var(--chart-1))",
  },
  copies: {
    label: "Copies",
    color: "hsl(var(--chart-2))",
  },
  pageViews: {
    label: "Page Views",
    color: "hsl(var(--chart-3))",
  },
  events: {
    label: "Events",
    color: "hsl(var(--chart-4))",
  },
};

const periods = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

type MetricKey = "clicks" | "copies" | "pageViews" | "events";

export function ActivityChart({ data, isLoading, period, onPeriodChange }: ActivityChartProps) {
  const [visibleLines, setVisibleLines] = useState<Record<MetricKey, boolean>>({
    clicks: true,
    copies: true,
    pageViews: true,
    events: true,
  });

  const toggleLine = (key: MetricKey) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const metrics: { key: MetricKey; label: string; color: string }[] = [
    { key: "clicks", label: "Clicks", color: "hsl(var(--chart-1))" },
    { key: "copies", label: "Copies", color: "hsl(var(--chart-2))" },
    { key: "pageViews", label: "Page Views", color: "hsl(var(--chart-3))" },
    { key: "events", label: "Events", color: "hsl(var(--chart-4))" },
  ];

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">Activity Over Time</CardTitle>
          <CardDescription>
            Track user engagement metrics across different time periods
          </CardDescription>
        </div>
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[160px]">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            {periods.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Legend with Checkboxes */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
          {metrics.map((metric) => (
            <label
              key={metric.key}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <Checkbox
                checked={visibleLines[metric.key]}
                onCheckedChange={() => toggleLine(metric.key)}
                className="border-2"
                style={{
                  borderColor: metric.color,
                  backgroundColor: visibleLines[metric.key] ? metric.color : "transparent",
                }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: metric.color }}
              >
                {metric.label}
              </span>
            </label>
          ))}
        </div>

        {isLoading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[350px] items-center justify-center text-muted-foreground">
            No activity data for this period
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
              />
              {visibleLines.clicks && (
                <Line
                  type="monotone"
                  dataKey="clicks"
                  name="Clicks"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--chart-1))" }}
                  activeDot={{ r: 5, fill: "hsl(var(--chart-1))" }}
                />
              )}
              {visibleLines.copies && (
                <Line
                  type="monotone"
                  dataKey="copies"
                  name="Copies"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--chart-2))" }}
                  activeDot={{ r: 5, fill: "hsl(var(--chart-2))" }}
                />
              )}
              {visibleLines.pageViews && (
                <Line
                  type="monotone"
                  dataKey="pageViews"
                  name="Page Views"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--chart-3))" }}
                  activeDot={{ r: 5, fill: "hsl(var(--chart-3))" }}
                />
              )}
              {visibleLines.events && (
                <Line
                  type="monotone"
                  dataKey="events"
                  name="Events"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--chart-4))" }}
                  activeDot={{ r: 5, fill: "hsl(var(--chart-4))" }}
                />
              )}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
