import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SurveyQuestionData {
  question: string;
  questionKey: string;
  isMultiSelect: boolean;
  labels: Record<string, string>;
  counts: Record<string, number>;
  totalResponses: number;
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
  compliance: "Compliance guarantee",
  one_time: "One-time payment (no monthly fees)",
  recommended: "Recommended by someone",
  only_option: "Only option I found for this",
};

const designGoalLabels: Record<string, string> = {
  launch_faster: "Launch new products faster",
  replace_design_team: "Replace design team",
  improve_ctr: "Improve CTR on existing products",
  scale_catalog: "Scale catalog (10+ SKUs)",
  reduce_costs: "Reduce image costs",
  experimenting: "Just experimenting",
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
  amazon_shopify: "Amazon + Shopify",
  amazon_etsy: "Amazon + Etsy",
  amazon_tiktok: "Amazon + TikTok Shop",
  multiple: "Multiple channels (Amazon + 2+ others)",
  shopify_etsy_only: "Shopify/Etsy only (no Amazon)",
};

const problemsBeforeLabels: Record<string, string> = {
  designer_delays: "Designer delays / ghosting",
  designer_quality: "Designer quality",
  afford_costs: "Can't afford per-product design costs",
  canva_generic: "Canva too generic",
  amazon_compliance: "Amazon compliance confusion",
  slow_turnaround: "Speed / slow turnaround",
};

const primaryGoalLabels: Record<string, string> = {
  launch_faster: "Launch new products faster",
  improve_ctr: "Improve CTR on existing products",
  scale_catalog: "Scale catalog (10+ SKUs)",
  replace_designer: "Replace designer / reduce costs",
  test_ads: "Test Meta/Instagram ads for first time",
  experimenting: "Just experimenting",
};

interface RawResponse {
  niche: string[] | null;
  niche_other: string | null;
  why_peelkit: string | null;
  design_goal: string | null;
  products_monthly: string | null;
  monthly_revenue: string | null;
  sales_channels: string | null;
  problems_before: string[] | null;
  primary_goal: string | null;
}

function countSingleField(responses: RawResponse[], field: keyof RawResponse, labels: Record<string, string>): Record<string, number> {
  const counts: Record<string, number> = {};
  // Init all known labels
  Object.keys(labels).forEach(k => { counts[k] = 0; });
  responses.forEach(r => {
    const val = r[field] as string | null;
    if (val) {
      counts[val] = (counts[val] || 0) + 1;
    }
  });
  return counts;
}

function countArrayField(responses: RawResponse[], field: keyof RawResponse, labels: Record<string, string>): Record<string, number> {
  const counts: Record<string, number> = {};
  Object.keys(labels).forEach(k => { counts[k] = 0; });
  responses.forEach(r => {
    const arr = r[field] as string[] | null;
    (arr || []).forEach(val => {
      counts[val] = (counts[val] || 0) + 1;
    });
  });
  return counts;
}

export function useInitialSurveyAnalytics() {
  return useQuery({
    queryKey: ["initial-survey-analytics"],
    queryFn: async (): Promise<{ totalResponses: number; questions: SurveyQuestionData[] }> => {
      const { data, error } = await supabase
        .from("onboarding_responses")
        .select("niche, niche_other, why_peelkit, design_goal, products_monthly, monthly_revenue, sales_channels, problems_before, primary_goal");

      if (error) throw error;
      const responses = (data || []) as RawResponse[];
      const total = responses.length;

      // Niche: multi-select + "other"
      const nicheCounts = countArrayField(responses, "niche", nicheLabels);
      // Count niche_other as "Other"
      const otherCount = responses.filter(r => r.niche_other).length;
      if (otherCount > 0) nicheCounts["other"] = otherCount;
      const nicheLabelsExt = { ...nicheLabels, ...(otherCount > 0 ? { other: "Other" } : {}) };

      const questions: SurveyQuestionData[] = [
        { question: "Which niche are you in?", questionKey: "niche", isMultiSelect: true, labels: nicheLabelsExt, counts: nicheCounts, totalResponses: total },
        { question: "Why did you choose PeelKit over alternatives?", questionKey: "why_peelkit", isMultiSelect: false, labels: whyPeelkitLabels, counts: countSingleField(responses, "why_peelkit", whyPeelkitLabels), totalResponses: total },
        { question: "How many products are you launching monthly?", questionKey: "products_monthly", isMultiSelect: false, labels: productsMonthlyLabels, counts: countSingleField(responses, "products_monthly", productsMonthlyLabels), totalResponses: total },
        { question: "What was your biggest problem BEFORE PeelKit?", questionKey: "problems_before", isMultiSelect: true, labels: problemsBeforeLabels, counts: countArrayField(responses, "problems_before", problemsBeforeLabels), totalResponses: total },
        { question: "What's your primary goal with PeelKit?", questionKey: "primary_goal", isMultiSelect: false, labels: primaryGoalLabels, counts: countSingleField(responses, "primary_goal", primaryGoalLabels), totalResponses: total },
        { question: "What's your monthly Amazon/Meta ad revenue right now?", questionKey: "monthly_revenue", isMultiSelect: false, labels: monthlyRevenueLabels, counts: countSingleField(responses, "monthly_revenue", monthlyRevenueLabels), totalResponses: total },
        { question: "Where else do you sell your products?", questionKey: "sales_channels", isMultiSelect: false, labels: salesChannelsLabels, counts: countSingleField(responses, "sales_channels", salesChannelsLabels), totalResponses: total },
        { question: "What's your design/imagery goal with PeelKit?", questionKey: "design_goal", isMultiSelect: false, labels: designGoalLabels, counts: countSingleField(responses, "design_goal", designGoalLabels), totalResponses: total },
      ];

      return { totalResponses: total, questions };
    },
  });
}
