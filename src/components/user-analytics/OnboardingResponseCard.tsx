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

const nicheLabels: Record<string, string> = {
  health_beauty: "Health & Beauty",
  wellness_supplements: "Wellness & Supplements",
  home_electronics: "Home & Electronics",
  pets: "Pets",
};

const whyPeelkitLabels: Record<string, string> = {
  price: "Price (best value)",
  speed: "Speed (fastest solution)",
  amazon_compliance: "Amazon compliance",
  one_time: "One-time payment (no monthly fees)",
  recommended: "Recommended by someone",
  only_option: "Only option I found for this",
};

const designGoalLabels: Record<string, string> = {
  solo: "I do it myself (solo)",
  in_house: "In-house designer / team member",
  freelancer: "Freelancer (Fiverr, Upwork, etc.)",
  agency: "Design agency",
  not_started: "Haven't started yet",
};

const productsMonthlyLabels: Record<string, string> = {
  less_than_1: "<1",
  "1_2": "1-2",
  "3_5": "3-5",
  "5_10": "5-10",
  "10_plus": "10+",
};

const monthlyRevenueLabels: Record<string, string> = {
  under_1k: "Under $1,000",
  "1k_5k": "$1K-$5K",
  "5k_20k": "$5K-$20K",
  "20k_50k": "$20K-$50K",
  "50k_plus": "$50K+",
  not_selling: "Not selling yet / new to this",
};

const salesChannelsLabels: Record<string, string> = {
  amazon_only: "Amazon only",
  shopify: "Shopify",
  etsy: "Etsy",
  tiktok: "TikTok Shop",
  not_amazon: "I don't sell on Amazon yet",
};

const problemsBeforeLabels: Record<string, string> = {
  high_costs: "High design costs",
  low_converting: "Low-converting images",
  time_consuming: "Time-consuming development",
  low_quality: "Low-quality design",
  amazon_compliance: "Amazon compliance confusion",
};

const primaryGoalLabels: Record<string, string> = {
  launch_faster: "Launch new products faster",
  replace_design_team: "Replace design team",
  improve_ctr: "Improve CTR on existing products",
  scale_catalog: "Scale catalog (10+ SKUs)",
  reduce_costs: "Reduce image costs",
  experimenting: "Just experimenting",
};

const getLabel = (value: string | null, labels: Record<string, string>): string => {
  if (!value) return "Not specified";
  return labels[value] || value.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
};

const getArrayLabels = (values: string[] | string | null, labels: Record<string, string>): string[] => {
  if (!values) return [];
  const arr = Array.isArray(values) ? values : [values];
  return arr.map(v => getLabel(v, labels));
};

const ResponseItem = ({
  icon: Icon,
  question,
  value,
}: {
  icon: React.ElementType;
  question: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-muted-foreground mb-2">{question}</p>
      <div>{value}</div>
    </div>
  </div>
);

const BadgeList = ({ items }: { items: string[] }) =>
  items.length > 0 ? (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
      ))}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">Not specified</p>
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
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
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

  const niches = [
    ...(data.niche || []).map(n => getLabel(n, nicheLabels)),
    data.niche_other,
  ].filter(Boolean) as string[];

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
        <div className="grid gap-4 md:grid-cols-2">
          <ResponseItem icon={Store} question="Q1: Which niche are you in?" value={<BadgeList items={niches} />} />
          <ResponseItem icon={MessageSquare} question="Q2: Why did you choose PeelKit over alternatives?" value={<BadgeList items={getArrayLabels(data.why_peelkit, whyPeelkitLabels)} />} />
          <ResponseItem icon={Palette} question="Q3: Who currently handles your product design & imagery?" value={<BadgeList items={getArrayLabels(data.design_goal, designGoalLabels)} />} />
          <ResponseItem icon={ShoppingCart} question="Q4: How many products are you launching monthly?" value={<p className="text-sm font-medium">{getLabel(data.products_monthly, productsMonthlyLabels)}</p>} />
          <ResponseItem icon={DollarSign} question="Q5: What's your monthly Amazon revenue right now?" value={<p className="text-sm font-medium">{getLabel(data.monthly_revenue, monthlyRevenueLabels)}</p>} />
          <ResponseItem icon={Store} question="Q6: Where else do you sell your products?" value={<BadgeList items={getArrayLabels(data.sales_channels, salesChannelsLabels)} />} />
          <ResponseItem icon={AlertCircle} question="Q7: What was your biggest problem BEFORE PeelKit?" value={<BadgeList items={getArrayLabels(data.problems_before, problemsBeforeLabels)} />} />
          <ResponseItem icon={Target} question="Q8: What's your primary goal with PeelKit?" value={<p className="text-sm font-medium">{getLabel(data.primary_goal, primaryGoalLabels)}</p>} />
        </div>
      </CardContent>
    </Card>
  );
}
