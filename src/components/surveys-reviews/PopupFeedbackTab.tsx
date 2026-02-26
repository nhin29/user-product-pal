import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, CheckCircle, XCircle, TrendingUp, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePopupFeedbackAnalytics,
  easeOfUseLabels,
  featuresUsedLabels,
  improvementsLabels,
} from "@/hooks/usePopupFeedbackAnalytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const CHART_COLOR = "hsl(var(--primary))";

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BarChartCard({
  title,
  data,
}: {
  title: string;
  data: { name: string; count: number }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.every((d) => d.count === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default function PopupFeedbackTab() {
  const { data, isLoading } = usePopupFeedbackAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.totalResponses === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Feedback Yet</h3>
          <p className="text-sm max-w-md mx-auto">
            No pop-up feedback responses have been collected yet. Data will appear here once users complete the feedback questionnaire.
          </p>
        </CardContent>
      </Card>
    );
  }

  const npsData = Object.entries(data.npsDistribution).map(([score, count]) => ({
    name: score,
    count,
  }));

  const qualityData = Object.entries(data.imageQualityDistribution).map(([score, count]) => ({
    name: `${score}★`,
    count,
  }));

  const easeData = Object.entries(data.easeOfUseCounts).map(([key, count]) => ({
    name: easeOfUseLabels[key] || key,
    count,
  }));

  const featuresData = Object.entries(data.featuresUsedCounts).map(([key, count]) => ({
    name: featuresUsedLabels[key] || key,
    count,
  }));

  const improvementsData = Object.entries(data.improvementsCounts).map(([key, count]) => ({
    name: improvementsLabels[key] || key,
    count,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Responses" value={data.totalResponses} />
        <StatCard icon={CheckCircle} label="Completed" value={data.completedCount} />
        <StatCard icon={XCircle} label="Dismissed" value={data.dismissedCount} />
        <StatCard
          icon={TrendingUp}
          label="Avg NPS Score"
          value={data.avgNps !== null ? data.avgNps.toFixed(1) : "—"}
        />
      </div>

      {/* Avg Image Quality */}
      {data.avgImageQuality !== null && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Image Quality Rating</p>
              <p className="text-xl font-bold text-foreground">{data.avgImageQuality.toFixed(1)} / 5</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <BarChartCard title="NPS Score Distribution (0-10)" data={npsData} />
        <BarChartCard title="Image Quality Rating Distribution" data={qualityData} />
        <BarChartCard title="Ease of Use" data={easeData} />
        <BarChartCard title="Features Used (multi-select)" data={featuresData} />
        <BarChartCard title="Suggested Improvements (multi-select)" data={improvementsData} />
      </div>
    </div>
  );
}
