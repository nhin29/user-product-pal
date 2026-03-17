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

export interface FreeTextEntry {
  text: string;
  count: number;
}

export interface FreeTextQuestionData {
  question: string;
  questionKey: string;
  entries: FreeTextEntry[];
  totalResponses: number;
}

// Q1: Business type
const businessTypeLabels: Record<string, string> = {
  brand_owner: "Brand owner",
  dropshipping: "Dropshipping store owner",
  amazon_seller: "Amazon seller",
  agency: "Agency",
  freelancer: "Freelancer (designer, etc.)",
  multiple_brands: "Multiple brands owner",
};

// Q3: Products count
const productsCountLabels: Record<string, string> = {
  "1": "1",
  "2_5": "2–5",
  "6_10": "6–10",
  "10_plus": "10+",
};

// Q4: Usage frequency
const usageFrequencyLabels: Record<string, string> = {
  one_time: "One-time project",
  occasional: "Occasional use",
  monthly: "Monthly use",
  weekly: "Weekly use",
  daily: "Daily / ongoing use",
};

// Q5: Images monthly
const imagesMonthlyLabels: Record<string, string> = {
  "1_10": "1–10",
  "10_30": "10–30",
  "30_100": "30–100",
  "100_plus": "100+",
};

// Q6: Output type
const outputTypeLabels: Record<string, string> = {
  few_high_quality: "A few high-quality images",
  larger_number: "A larger number of images",
};

// Q7: Future features
const futureFeaturesLabels: Record<string, string> = {
  video_ugc: "Video/UGC generation",
  advertorial_builder: "Advertorial page builder",
  meta_ads: "Image ad generation for Meta",
  email_builder: "Email design builder",
};

interface RawResponse {
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
}

function countSingleField(
  responses: RawResponse[],
  field: keyof RawResponse,
  labels: Record<string, string>
): Record<string, number> {
  const counts: Record<string, number> = {};
  Object.keys(labels).forEach((key) => { counts[key] = 0; });

  responses.forEach((response) => {
    const raw = response[field];
    if (typeof raw !== "string" || !raw) return;
    if (raw in labels) {
      counts[raw] += 1;
    }
  });

  return counts;
}

function countArrayField(
  responses: RawResponse[],
  field: keyof RawResponse,
  labels: Record<string, string>
): Record<string, number> {
  const counts: Record<string, number> = {};
  Object.keys(labels).forEach((key) => { counts[key] = 0; });

  responses.forEach((response) => {
    const raw = response[field];
    const selections = Array.isArray(raw) ? raw : typeof raw === "string" && raw ? [raw] : [];
    selections.forEach((selection) => {
      if (selection in labels) {
        counts[selection] += 1;
      }
    });
  });

  return counts;
}

function collectFreeText(responses: RawResponse[], field: keyof RawResponse): FreeTextEntry[] {
  const map = new Map<string, number>();
  responses.forEach((r) => {
    const val = r[field];
    if (typeof val === "string" && val.trim()) {
      const normalized = val.trim().toLowerCase();
      map.set(normalized, (map.get(normalized) || 0) + 1);
    }
  });
  return Array.from(map.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count);
}

export function useInitialSurveyAnalytics() {
  return useQuery({
    queryKey: ["initial-survey-analytics"],
    queryFn: async (): Promise<{
      totalResponses: number;
      questions: SurveyQuestionData[];
      freeTextQuestions: FreeTextQuestionData[];
    }> => {
      const { data, error } = await supabase
        .from("onboarding_responses")
        .select("business_type, business_type_other, niche_text, products_count, usage_frequency, images_monthly, output_type, output_type_other, future_features, future_features_other, hoping_for");

      if (error) throw error;
      const responses = (data || []) as RawResponse[];
      const total = responses.length;

      // Q1: Business type (single + other)
      const businessCounts = countSingleField(responses, "business_type", businessTypeLabels);
      const otherBizCount = responses.filter(r => r.business_type_other).length;
      if (otherBizCount > 0) businessCounts["other"] = otherBizCount;
      const businessLabelsExt = { ...businessTypeLabels, ...(otherBizCount > 0 ? { other: "Other" } : {}) };

      // Q6: Output type (single + other)
      const outputCounts = countSingleField(responses, "output_type", outputTypeLabels);
      const otherOutputCount = responses.filter(r => r.output_type_other).length;
      if (otherOutputCount > 0) outputCounts["other"] = otherOutputCount;
      const outputLabelsExt = { ...outputTypeLabels, ...(otherOutputCount > 0 ? { other: "Other" } : {}) };

      // Q7: Future features (multi + other)
      const featureCounts = countArrayField(responses, "future_features", futureFeaturesLabels);
      const otherFeatureCount = responses.filter(r => r.future_features_other).length;
      if (otherFeatureCount > 0) featureCounts["other"] = otherFeatureCount;
      const featureLabelsExt = { ...futureFeaturesLabels, ...(otherFeatureCount > 0 ? { other: "Other" } : {}) };

      const questions: SurveyQuestionData[] = [
        { question: "What best describes your business?", questionKey: "business_type", isMultiSelect: false, labels: businessLabelsExt, counts: businessCounts, totalResponses: total },
        { question: "How many products do you currently sell?", questionKey: "products_count", isMultiSelect: false, labels: productsCountLabels, counts: countSingleField(responses, "products_count", productsCountLabels), totalResponses: total },
        { question: "Are you looking for a one-time or ongoing image creation?", questionKey: "usage_frequency", isMultiSelect: false, labels: usageFrequencyLabels, counts: countSingleField(responses, "usage_frequency", usageFrequencyLabels), totalResponses: total },
        { question: "How many product images do you need monthly?", questionKey: "images_monthly", isMultiSelect: false, labels: imagesMonthlyLabels, counts: countSingleField(responses, "images_monthly", imagesMonthlyLabels), totalResponses: total },
        { question: "What kind of output are you mainly looking for?", questionKey: "output_type", isMultiSelect: false, labels: outputLabelsExt, counts: outputCounts, totalResponses: total },
        { question: "Which future PeelKit features excite you most?", questionKey: "future_features", isMultiSelect: true, labels: featureLabelsExt, counts: featureCounts, totalResponses: total },
      ];

      const freeTextQuestions: FreeTextQuestionData[] = [
        { question: "Which niche are you in?", questionKey: "niche_text", entries: collectFreeText(responses, "niche_text"), totalResponses: total },
        { question: "What are you hoping PeelKit will help you do?", questionKey: "hoping_for", entries: collectFreeText(responses, "hoping_for"), totalResponses: total },
      ];

      return { totalResponses: total, questions, freeTextQuestions };
    },
  });
}
