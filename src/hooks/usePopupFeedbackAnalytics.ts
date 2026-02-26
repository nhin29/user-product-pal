import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PopupFeedbackData {
  totalResponses: number;
  completedCount: number;
  dismissedCount: number;
  avgNps: number | null;
  avgImageQuality: number | null;
  npsDistribution: Record<number, number>;
  imageQualityDistribution: Record<number, number>;
  easeOfUseCounts: Record<string, number>;
  featuresUsedCounts: Record<string, number>;
  improvementsCounts: Record<string, number>;
}

const easeOfUseLabels: Record<string, string> = {
  very_easy: "Very Easy",
  easy: "Easy",
  neutral: "Neutral",
  difficult: "Difficult",
  very_difficult: "Very Difficult",
};

const featuresUsedLabels: Record<string, string> = {
  copy_prompts: "Copy Prompts",
  browse_templates: "Browse Templates",
  generate_images: "Generate Images",
  save_favorites: "Save Favorites",
  customize_prompts: "Customize Prompts",
};

const improvementsLabels: Record<string, string> = {
  faster_generation: "Faster Generation",
  more_categories: "More Categories",
  better_prompts: "Better Prompts",
  more_templates: "More Templates",
  pricing: "Better Pricing",
  mobile_app: "Mobile App",
};

export { easeOfUseLabels, featuresUsedLabels, improvementsLabels };

interface RawFeedback {
  nps_score: number | null;
  image_quality_rating: number | null;
  ease_of_use: string | null;
  features_used: string[] | null;
  improvements: string[] | null;
  completed_at: string | null;
  dismissed_at: string | null;
}

export function usePopupFeedbackAnalytics() {
  return useQuery({
    queryKey: ["popup-feedback-analytics"],
    queryFn: async (): Promise<PopupFeedbackData> => {
      const { data, error } = await supabase
        .from("feedback_questionnaire")
        .select("nps_score, image_quality_rating, ease_of_use, features_used, improvements, completed_at, dismissed_at");

      if (error) throw error;
      const rows = (data || []) as RawFeedback[];

      const total = rows.length;
      const completedCount = rows.filter((r) => r.completed_at).length;
      const dismissedCount = rows.filter((r) => r.dismissed_at).length;

      // NPS
      const npsValues = rows.map((r) => r.nps_score).filter((v): v is number => v !== null);
      const avgNps = npsValues.length > 0 ? npsValues.reduce((a, b) => a + b, 0) / npsValues.length : null;
      const npsDistribution: Record<number, number> = {};
      for (let i = 0; i <= 10; i++) npsDistribution[i] = 0;
      npsValues.forEach((v) => { npsDistribution[v] = (npsDistribution[v] || 0) + 1; });

      // Image Quality
      const qualityValues = rows.map((r) => r.image_quality_rating).filter((v): v is number => v !== null);
      const avgImageQuality = qualityValues.length > 0 ? qualityValues.reduce((a, b) => a + b, 0) / qualityValues.length : null;
      const imageQualityDistribution: Record<number, number> = {};
      for (let i = 1; i <= 5; i++) imageQualityDistribution[i] = 0;
      qualityValues.forEach((v) => { imageQualityDistribution[v] = (imageQualityDistribution[v] || 0) + 1; });

      // Ease of Use
      const easeOfUseCounts: Record<string, number> = {};
      Object.keys(easeOfUseLabels).forEach((k) => (easeOfUseCounts[k] = 0));
      rows.forEach((r) => {
        if (r.ease_of_use && r.ease_of_use in easeOfUseLabels) {
          easeOfUseCounts[r.ease_of_use] += 1;
        }
      });

      // Features Used
      const featuresUsedCounts: Record<string, number> = {};
      Object.keys(featuresUsedLabels).forEach((k) => (featuresUsedCounts[k] = 0));
      rows.forEach((r) => {
        const arr = Array.isArray(r.features_used) ? r.features_used : [];
        arr.forEach((f) => {
          if (f in featuresUsedLabels) featuresUsedCounts[f] += 1;
        });
      });

      // Improvements
      const improvementsCounts: Record<string, number> = {};
      Object.keys(improvementsLabels).forEach((k) => (improvementsCounts[k] = 0));
      rows.forEach((r) => {
        const arr = Array.isArray(r.improvements) ? r.improvements : [];
        arr.forEach((imp) => {
          if (imp in improvementsLabels) improvementsCounts[imp] += 1;
        });
      });

      return {
        totalResponses: total,
        completedCount,
        dismissedCount,
        avgNps,
        avgImageQuality,
        npsDistribution,
        imageQualityDistribution,
        easeOfUseCounts,
        featuresUsedCounts,
        improvementsCounts,
      };
    },
  });
}
