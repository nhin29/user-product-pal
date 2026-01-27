import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Target, Palette, DollarSign, ShoppingCart, Store, AlertCircle, MessageSquare, Users, Briefcase } from "lucide-react";

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

// Label mappings for database values
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
  scale_catalog: "Scale catalog (10+ SKUs)",
};

const productsMonthlyLabels: Record<string, string> = {
  less_1: "<1",
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
  amazon_etsy: "Amazon & Etsy",
  amazon_shopify: "Amazon & Shopify",
};

const problemsBeforeLabels: Record<string, string> = {
  high_costs: "High design costs",
  afford_costs: "High design costs",
  low_converting: "Low-converting images",
  time_consuming: "Time-consuming development",
  low_quality: "Low-quality design",
  canva_generic: "Generic Canva templates",
  compliance_confusion: "Amazon compliance confusion",
};

const primaryGoalLabels: Record<string, string> = {
  launch_faster: "Launch new products faster",
  replace_team: "Replace design team",
  improve_ctr: "Improve CTR on existing products",
  scale_catalog: "Scale catalog (10+ SKUs)",
  reduce_costs: "Reduce image costs",
  experimenting: "Just experimenting",
};

const getLabel = (value: string | null, labels: Record<string, string>): string => {
  if (!value) return "Not specified";
  return labels[value] || value.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
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
  ].filter(Boolean);

  const problems = (data.problems_before || []).map(p => getLabel(p, problemsBeforeLabels));

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
          {/* Q1: Niche */}
          <ResponseItem
            icon={Store}
            question="Q1: Which niche are you in?"
            value={
              niches.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {niches.map((niche, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {niche}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not specified</p>
              )
            }
          />

          {/* Q2: Why PeelKit */}
          <ResponseItem
            icon={MessageSquare}
            question="Q2: Why did you choose PeelKit over alternatives?"
            value={
              <p className="text-sm font-medium">
                {getLabel(data.why_peelkit, whyPeelkitLabels)}
              </p>
            }
          />

          {/* Q3: Design Goal (Who handles design) */}
          <ResponseItem
            icon={Palette}
            question="Q3: Who currently handles your product design & imagery?"
            value={
              <p className="text-sm font-medium">
                {getLabel(data.design_goal, designGoalLabels)}
              </p>
            }
          />

          {/* Q4: Products Monthly */}
          <ResponseItem
            icon={ShoppingCart}
            question="Q4: How many products are you launching monthly?"
            value={
              <p className="text-sm font-medium">
                {getLabel(data.products_monthly, productsMonthlyLabels)}
              </p>
            }
          />

          {/* Q5: Monthly Revenue */}
          <ResponseItem
            icon={DollarSign}
            question="Q5: What's your monthly Amazon revenue right now?"
            value={
              <p className="text-sm font-medium">
                {getLabel(data.monthly_revenue, monthlyRevenueLabels)}
              </p>
            }
          />

          {/* Q6: Sales Channels */}
          <ResponseItem
            icon={Briefcase}
            question="Q6: Where else do you sell your products?"
            value={
              <p className="text-sm font-medium">
                {getLabel(data.sales_channels, salesChannelsLabels)}
              </p>
            }
          />

          {/* Q7: Problems Before */}
          <ResponseItem
            icon={AlertCircle}
            question="Q7: What was your biggest problem BEFORE PeelKit?"
            value={
              problems.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {problems.map((problem, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {problem}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not specified</p>
              )
            }
          />

          {/* Q8: Primary Goal */}
          <ResponseItem
            icon={Target}
            question="Q8: What's your primary goal with PeelKit?"
            value={
              <p className="text-sm font-medium">
                {getLabel(data.primary_goal, primaryGoalLabels)}
              </p>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
