import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Target, Palette, DollarSign, ShoppingCart, Store, AlertCircle, MessageSquare } from "lucide-react";

interface OnboardingResponse {
  niche: string[] | null;
  niche_other: string | null;
  primary_goal: string | null;
  design_goal: string | null;
  monthly_revenue: string | null;
  products_monthly: string | null;
  sales_channels: string | null;
  problems_before: string[] | null;
  why_peelkit: string | null;
  completed_at: string | null;
}

interface OnboardingResponseCardProps {
  data: OnboardingResponse | null;
  isLoading: boolean;
}

const ResponseItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-1">{value}</div>
    </div>
  </div>
);

export function OnboardingResponseCard({ data, isLoading }: OnboardingResponseCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Onboarding Responses
          </CardTitle>
          <CardDescription>User's onboarding survey answers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Onboarding Responses
          </CardTitle>
          <CardDescription>User's onboarding survey answers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No onboarding responses recorded</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const niches = [...(data.niche || []), data.niche_other].filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Onboarding Responses
        </CardTitle>
        <CardDescription>
          User's onboarding survey answers
          {data.completed_at && (
            <span className="ml-2 text-xs">
              • Completed {new Date(data.completed_at).toLocaleDateString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {niches.length > 0 && (
            <ResponseItem
              icon={Store}
              label="Niche"
              value={
                <div className="flex flex-wrap gap-1">
                  {niches.map((niche, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {niche}
                    </Badge>
                  ))}
                </div>
              }
            />
          )}

          {data.primary_goal && (
            <ResponseItem
              icon={Target}
              label="Primary Goal"
              value={<p className="text-sm font-medium">{data.primary_goal}</p>}
            />
          )}

          {data.design_goal && (
            <ResponseItem
              icon={Palette}
              label="Design Goal"
              value={<p className="text-sm font-medium">{data.design_goal}</p>}
            />
          )}

          {data.monthly_revenue && (
            <ResponseItem
              icon={DollarSign}
              label="Monthly Revenue"
              value={<p className="text-sm font-medium">{data.monthly_revenue}</p>}
            />
          )}

          {data.products_monthly && (
            <ResponseItem
              icon={ShoppingCart}
              label="Products Monthly"
              value={<p className="text-sm font-medium">{data.products_monthly}</p>}
            />
          )}

          {data.sales_channels && (
            <ResponseItem
              icon={Store}
              label="Sales Channels"
              value={<p className="text-sm font-medium">{data.sales_channels}</p>}
            />
          )}

          {data.problems_before && data.problems_before.length > 0 && (
            <ResponseItem
              icon={AlertCircle}
              label="Problems Before"
              value={
                <div className="flex flex-wrap gap-1">
                  {data.problems_before.map((problem, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {problem}
                    </Badge>
                  ))}
                </div>
              }
            />
          )}

          {data.why_peelkit && (
            <ResponseItem
              icon={MessageSquare}
              label="Why PeelKit"
              value={<p className="text-sm font-medium">{data.why_peelkit}</p>}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
