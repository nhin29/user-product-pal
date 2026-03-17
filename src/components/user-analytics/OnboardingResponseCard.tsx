import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toLocaleDateStringNY } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Briefcase, Store, ShoppingCart, Clock, ImageIcon, Layout, Sparkles, MessageSquare } from "lucide-react";

interface OnboardingResponse {
  business_type: string | null;
  business_type_other: string | null;
  niche_text: string | null;
  products_count: string | null;
  usage_frequency: string | null;
  images_monthly: string | null;
  output_type: string | null;
  output_type_other: string | null;
  future_features: string[] | null;
  future_features_other: string | null;
  hoping_for: string | null;
  completed_at: string | null;
}

interface OnboardingResponseCardProps {
  data: OnboardingResponse | null;
  isLoading: boolean;
}

const businessTypeLabels: Record<string, string> = {
  brand_owner: "Brand owner",
  dropshipping: "Dropshipping store owner",
  amazon_seller: "Amazon seller",
  agency: "Agency",
  freelancer: "Freelancer (designer, etc.)",
  multiple_brands: "Multiple brands owner",
};

const productsCountLabels: Record<string, string> = {
  "1": "1",
  "2_5": "2–5",
  "6_10": "6–10",
  "10_plus": "10+",
};

const usageFrequencyLabels: Record<string, string> = {
  one_time: "One-time project",
  occasional: "Occasional use",
  monthly: "Monthly use",
  weekly: "Weekly use",
  daily: "Daily / ongoing use",
};

const imagesMonthlyLabels: Record<string, string> = {
  "1_10": "1–10",
  "10_30": "10–30",
  "30_100": "30–100",
  "100_plus": "100+",
};

const outputTypeLabels: Record<string, string> = {
  few_high_quality: "A few high-quality images",
  larger_number: "A larger number of images",
};

const futureFeaturesLabels: Record<string, string> = {
  video_ugc: "Video/UGC generation",
  advertorial_builder: "Advertorial page builder",
  meta_ads: "Image ad generation for Meta",
  email_builder: "Email design builder",
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

  const businessDisplay = data.business_type_other
    ? `${getLabel(data.business_type, businessTypeLabels)} (${data.business_type_other})`
    : getLabel(data.business_type, businessTypeLabels);

  const outputDisplay = data.output_type_other
    ? `${getLabel(data.output_type, outputTypeLabels)} (${data.output_type_other})`
    : getLabel(data.output_type, outputTypeLabels);

  const futureItems = [
    ...getArrayLabels(data.future_features, futureFeaturesLabels),
    ...(data.future_features_other ? [data.future_features_other] : []),
  ];

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
              • Completed {toLocaleDateStringNY(data.completed_at)}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <ResponseItem icon={Briefcase} question="Q1: What best describes your business?" value={<p className="text-sm font-medium">{businessDisplay}</p>} />
          <ResponseItem icon={Store} question="Q2: Which niche are you in?" value={<p className="text-sm font-medium">{data.niche_text || "Not specified"}</p>} />
          <ResponseItem icon={ShoppingCart} question="Q3: How many products do you currently sell?" value={<p className="text-sm font-medium">{getLabel(data.products_count, productsCountLabels)}</p>} />
          <ResponseItem icon={Clock} question="Q4: One-time or ongoing image creation?" value={<p className="text-sm font-medium">{getLabel(data.usage_frequency, usageFrequencyLabels)}</p>} />
          <ResponseItem icon={ImageIcon} question="Q5: How many product images monthly?" value={<p className="text-sm font-medium">{getLabel(data.images_monthly, imagesMonthlyLabels)}</p>} />
          <ResponseItem icon={Layout} question="Q6: What kind of output are you looking for?" value={<p className="text-sm font-medium">{outputDisplay}</p>} />
          <ResponseItem icon={Sparkles} question="Q7: Which future features excite you most?" value={<BadgeList items={futureItems} />} />
          <ResponseItem icon={MessageSquare} question="Q8: What are you hoping PeelKit will help you do?" value={<p className="text-sm font-medium">{data.hoping_for || "Not specified"}</p>} />
        </div>
      </CardContent>
    </Card>
  );
}
