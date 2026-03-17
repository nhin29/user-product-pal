import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useInitialSurveyAnalytics, type SurveyQuestionData, type FreeTextQuestionData } from "@/hooks/useInitialSurveyAnalytics";
import { Users, TrendingUp, TrendingDown, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(220, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(160, 55%, 45%)",
  "hsl(40, 80%, 50%)",
  "hsl(200, 65%, 50%)",
  "hsl(100, 50%, 45%)",
];

function SurveyQuestionCard({ data, index }: { data: SurveyQuestionData; index: number }) {
  const entries = Object.entries(data.counts)
    .map(([key, count]) => ({
      key,
      label: data.labels[key] || key.replace(/_/g, " "),
      count,
      percentage: data.totalResponses > 0 ? Math.round((count / data.totalResponses) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const mostCommon = entries[0];
  const leastCommon = entries.filter(e => e.count > 0).slice(-1)[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">
              Q{index + 1}: {data.question}
            </CardTitle>
            <CardDescription className="mt-1">
              {data.totalResponses} responses{data.isMultiSelect ? " (multi-select)" : ""}
            </CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {mostCommon && mostCommon.count > 0 && (
            <Badge variant="outline" className="text-[11px] border-emerald-500 text-emerald-700 bg-emerald-500/10 gap-1">
              <TrendingUp className="h-3 w-3" />
              Most: {mostCommon.label} ({mostCommon.percentage}%)
            </Badge>
          )}
          {leastCommon && leastCommon !== mostCommon && leastCommon.count > 0 && (
            <Badge variant="outline" className="text-[11px] border-orange-500 text-orange-700 bg-orange-500/10 gap-1">
              <TrendingDown className="h-3 w-3" />
              Least: {leastCommon.label} ({leastCommon.percentage}%)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={entries} layout="vertical" margin={{ left: 20, right: 16, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                dataKey="label"
                type="category"
                width={200}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                formatter={(value: number) => [`${value} (${data.totalResponses > 0 ? Math.round((value / data.totalResponses) * 100) : 0}%)`, "Responses"]}
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {entries.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function FreeTextQuestionCard({ data, questionNumber }: { data: FreeTextQuestionData; questionNumber: number }) {
  const displayEntries = data.entries.slice(0, 20);
  const uniqueCount = data.entries.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Q{questionNumber}: {data.question}
            </CardTitle>
            <CardDescription className="mt-1">
              {data.entries.reduce((sum, e) => sum + e.count, 0)} responses • {uniqueCount} unique answers
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displayEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No responses yet</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {displayEntries.map((entry, i) => (
              <div key={i} className="flex items-start justify-between gap-3 p-2.5 rounded-md bg-muted/50 border border-border/50">
                <p className="text-sm text-foreground/90 flex-1 capitalize">{entry.text}</p>
                {entry.count > 1 && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">×{entry.count}</Badge>
                )}
              </div>
            ))}
            {data.entries.length > 20 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{data.entries.length - 20} more responses
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function InitialSurveyTab() {
  const { data, isLoading } = useInitialSurveyAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
              <CardContent><Skeleton className="h-[200px] w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.totalResponses === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">No survey responses yet</p>
          <p className="text-sm mt-1">Data will appear here when users complete the onboarding survey.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total responses stat */}
      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold">{data.totalResponses}</p>
            <p className="text-sm text-muted-foreground">Total Survey Responses</p>
          </div>
        </CardContent>
      </Card>

      {/* Chart questions grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {data.questions.map((q, i) => (
          <SurveyQuestionCard key={q.questionKey} data={q} index={i === 0 ? 0 : i + 1} />
        ))}
      </div>

      {/* Free text questions */}
      <div className="grid gap-6 md:grid-cols-2">
        <FreeTextQuestionCard data={data.freeTextQuestions[0]} questionNumber={2} />
        <FreeTextQuestionCard data={data.freeTextQuestions[1]} questionNumber={8} />
      </div>
    </div>
  );
}
