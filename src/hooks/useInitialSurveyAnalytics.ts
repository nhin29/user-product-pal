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

// Q1
const nicheLabels: Record<string, string> = {
  health_beauty: "Health & Beauty",
  wellness_supplements: "Wellness & Supplements",
  home_electronics: "Home & Electronics",
  pets: "Pets",
};

// Q2
const whyPeelkitLabels: Record<string, string> = {
  price: "Price (best value)",
  speed: "Speed (fastest solution)",
  amazon_compliance: "Amazon compliance",
  one_time: "One-time payment (no monthly fees)",
  recommended: "Recommended by someone",
  only_option: "Only option I found for this",
};

// Q3
const designGoalLabels: Record<string, string> = {
  solo: "I do it myself (solo)",
  in_house: "In-house designer / team member",
  freelancer: "Freelancer (Fiverr, Upwork, etc.)",
  agency: "Design agency",
  not_started: "Haven't started yet",
};

// Q4
const productsMonthlyLabels: Record<string, string> = {
  less_than_1: "<1",
  "1_2": "1-2",
  "3_5": "3-5",
  "5_10": "5-10",
  "10_plus": "10+",
};

// Q5
const monthlyRevenueLabels: Record<string, string> = {
  under_1k: "Under $1,000",
  "1k_5k": "$1K-$5K",
  "5k_20k": "$5K-$20K",
  "20k_50k": "$20K-$50K",
  "50k_plus": "$50K+",
  not_selling: "Not selling yet / new to this",
};

// Q6
const salesChannelsLabels: Record<string, string> = {
  amazon_only: "Amazon only",
  shopify: "Shopify",
  etsy: "Etsy",
  tiktok: "TikTok Shop",
  not_amazon: "I don't sell on Amazon yet",
};

// Q7
const problemsBeforeLabels: Record<string, string> = {
  high_costs: "High design costs",
  low_converting: "Low-converting images",
  time_consuming: "Time-consuming development",
  low_quality: "Low-quality design",
  amazon_compliance: "Amazon compliance confusion",
};

// Q8
const primaryGoalLabels: Record<string, string> = {
  launch_faster: "Launch new products faster",
  replace_design_team: "Replace design team",
  improve_ctr: "Improve CTR on existing products",
  scale_catalog: "Scale catalog (10+ SKUs)",
  reduce_costs: "Reduce image costs",
  experimenting: "Just experimenting",
};

interface RawResponse {
  niche: string[] | null;
  niche_other: string | null;
  why_peelkit: string[] | null;
  design_goal: string[] | null;
  products_monthly: string | null;
  monthly_revenue: string | null;
  sales_channels: string[] | null;
  problems_before: string[] | null;
  primary_goal: string | null;
}

const whyPeelkitAliases: Record<string, string> = {
  compliance: "amazon_compliance",
};

const salesChannelsAliases: Record<string, string> = {
  amazon_shopify: "shopify",
  amazon_etsy: "etsy",
  amazon_tiktok: "tiktok",
};

const salesChannelsExpansions: Record<string, string[]> = {
  multiple: ["shopify", "etsy", "tiktok"],
  shopify_etsy_only: ["shopify", "etsy", "not_amazon"],
};

const problemsBeforeAliases: Record<string, string> = {
  designer_delays: "time_consuming",
  slow_turnaround: "time_consuming",
  designer_quality: "low_quality",
  canva_generic: "low_quality",
  afford_costs: "high_costs",
};

const primaryGoalAliases: Record<string, string> = {
  replace_designer: "replace_design_team",
  test_ads: "experimenting",
};

function countSingleField(
  responses: RawResponse[],
  field: keyof RawResponse,
  labels: Record<string, string>,
  aliases: Record<string, string> = {}
): Record<string, number> {
  const counts: Record<string, number> = {};
  Object.keys(labels).forEach((key) => {
    counts[key] = 0;
  });

  responses.forEach((response) => {
    const raw = response[field];
    if (typeof raw !== "string" || !raw) return;

    const normalized = aliases[raw] || raw;
    if (normalized in labels) {
      counts[normalized] += 1;
    }
  });

  return counts;
}

function countArrayField(
  responses: RawResponse[],
  field: keyof RawResponse,
  labels: Record<string, string>,
  options: { aliases?: Record<string, string>; expansions?: Record<string, string[]> } = {}
): Record<string, number> {
  const counts: Record<string, number> = {};
  const aliases = options.aliases || {};
  const expansions = options.expansions || {};

  Object.keys(labels).forEach((key) => {
    counts[key] = 0;
  });

  responses.forEach((response) => {
    const raw = response[field];
    const selections = Array.isArray(raw) ? raw : typeof raw === "string" && raw ? [raw] : [];

    selections.forEach((selection) => {
      const normalized = aliases[selection] || selection;
      const mappedValues = expansions[normalized] || [normalized];

      mappedValues.forEach((value) => {
        if (value in labels) {
          counts[value] += 1;
        }
      });
    });
  });

  return counts;
}

function countPrimaryGoalField(responses: RawResponse[]): Record<string, number> {
  const counts: Record<string, number> = {};
  Object.keys(primaryGoalLabels).forEach((key) => {
    counts[key] = 0;
  });

  responses.forEach((response) => {
    let value: string | null = typeof response.primary_goal === "string" ? response.primary_goal : null;

    if (!value && typeof response.design_goal === "string" && response.design_goal in primaryGoalLabels) {
      value = response.design_goal;
    }

    if (!value) return;

    const normalized = primaryGoalAliases[value] || value;
    if (normalized in primaryGoalLabels) {
      counts[normalized] += 1;
    }
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

      // Q1: Niche (multi-select + "other")
      const nicheCounts = countArrayField(responses, "niche", nicheLabels);
      const otherCount = responses.filter(r => r.niche_other).length;
      if (otherCount > 0) nicheCounts["other"] = otherCount;
      const nicheLabelsExt = { ...nicheLabels, ...(otherCount > 0 ? { other: "Other" } : {}) };

      const primaryGoalCounts = countPrimaryGoalField(responses);

      const questions: SurveyQuestionData[] = [
        { question: "Which niche are you in?", questionKey: "niche", isMultiSelect: true, labels: nicheLabelsExt, counts: nicheCounts, totalResponses: total },
        { question: "Why did you choose PeelKit over alternatives?", questionKey: "why_peelkit", isMultiSelect: true, labels: whyPeelkitLabels, counts: countArrayField(responses, "why_peelkit", whyPeelkitLabels, { aliases: whyPeelkitAliases }), totalResponses: total },
        { question: "Who currently handles your product design & imagery?", questionKey: "design_goal", isMultiSelect: true, labels: designGoalLabels, counts: countArrayField(responses, "design_goal", designGoalLabels), totalResponses: total },
        { question: "How many products are you launching monthly?", questionKey: "products_monthly", isMultiSelect: false, labels: productsMonthlyLabels, counts: countSingleField(responses, "products_monthly", productsMonthlyLabels), totalResponses: total },
        { question: "What's your monthly Amazon revenue right now?", questionKey: "monthly_revenue", isMultiSelect: false, labels: monthlyRevenueLabels, counts: countSingleField(responses, "monthly_revenue", monthlyRevenueLabels), totalResponses: total },
        { question: "Where else do you sell your products?", questionKey: "sales_channels", isMultiSelect: true, labels: salesChannelsLabels, counts: countArrayField(responses, "sales_channels", salesChannelsLabels, { aliases: salesChannelsAliases, expansions: salesChannelsExpansions }), totalResponses: total },
        { question: "What was your biggest problem BEFORE PeelKit?", questionKey: "problems_before", isMultiSelect: true, labels: problemsBeforeLabels, counts: countArrayField(responses, "problems_before", problemsBeforeLabels, { aliases: problemsBeforeAliases }), totalResponses: total },
        { question: "What's your primary goal with PeelKit?", questionKey: "primary_goal", isMultiSelect: false, labels: primaryGoalLabels, counts: primaryGoalCounts, totalResponses: total },
      ];

      return { totalResponses: total, questions };
    },
  });
}
