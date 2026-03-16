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
  templateCustomizationCounts: Record<string, number>;
  usefulnessCounts: Record<string, number>;
  additionalFeedback: string[];
}

const easeOfUseLabels: Record<string, string> = {
  very_easy: "Very Easy",
  easy: "Easy",
  neutral: "Neutral",
  difficult: "Difficult",
  very_difficult: "Very Difficult",
};

const templateCustomizationLabels: Record<string, string> = {
  very_easy: "Very Easy",
  easy: "Easy",
  neutral: "Neutral",
  difficult: "Difficult",
  very_difficult: "Very Difficult",
};

const usefulnessLabels: Record<string, string> = {
  more_categories: "More Template Categories",
  better_quality: "Better Image Quality",
  faster_generation: "Faster Generation",
  bulk_generation: "Bulk Generation",
  video_content: "Video Content",
};

export { easeOfUseLabels, templateCustomizationLabels, usefulnessLabels };

interface RawFeedback {
  nps_score: number | null;
  image_quality_rating: number | null;
  ease_of_use: string | null;
  template_customization: string | null;
  improvements: string[] | null;
  additional_feedback: string | null;
  completed_at: string | null;
  dismissed_at: string | null;
}

export function usePopupFeedbackAnalytics(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ["popup-feedback-analytics", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<PopupFeedbackData> => {
      let query = supabase
        .from("feedback_questionnaire")
        .select("nps_score, image_quality_rating, ease_of_use, template_customization, improvements, additional_feedback, completed_at, dismissed_at, created_at");

      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      const rows = (data || []) as RawFeedback[];

      const total = rows.length;
      const completedCount = rows.filter((r) => r.completed_at).length;
      const dismissedCount = rows.filter((r) => r.dismissed_at).length;

      // Q1: Image Quality (1-5)
      const qualityValues = rows.map((r) => r.image_quality_rating).filter((v): v is number => v !== null);
      const avgImageQuality = qualityValues.length > 0 ? qualityValues.reduce((a, b) => a + b, 0) / qualityValues.length : null;
      const imageQualityDistribution: Record<number, number> = {};
      for (let i = 1; i <= 5; i++) imageQualityDistribution[i] = 0;
      qualityValues.forEach((v) => { imageQualityDistribution[v] = (imageQualityDistribution[v] || 0) + 1; });

      // Q2: Ease of Use
      const easeOfUseCounts: Record<string, number> = {};
      Object.keys(easeOfUseLabels).forEach((k) => (easeOfUseCounts[k] = 0));
      rows.forEach((r) => {
        if (r.ease_of_use && r.ease_of_use in easeOfUseLabels) {
          easeOfUseCounts[r.ease_of_use] += 1;
        }
      });

      // Q3: Template Customization
      const templateCustomizationCounts: Record<string, number> = {};
      Object.keys(templateCustomizationLabels).forEach((k) => (templateCustomizationCounts[k] = 0));
      rows.forEach((r) => {
        if (r.template_customization && r.template_customization in templateCustomizationLabels) {
          templateCustomizationCounts[r.template_customization] += 1;
        }
      });

      // Q4: Usefulness / Improvements (multi-select)
      const usefulnessCounts: Record<string, number> = {};
      Object.keys(usefulnessLabels).forEach((k) => (usefulnessCounts[k] = 0));
      rows.forEach((r) => {
        const arr = Array.isArray(r.improvements) ? r.improvements : [];
        arr.forEach((imp) => {
          if (imp in usefulnessLabels) usefulnessCounts[imp] += 1;
        });
      });

      // Q5: NPS (1-10)
      const npsValues = rows.map((r) => r.nps_score).filter((v): v is number => v !== null);
      const avgNps = npsValues.length > 0 ? npsValues.reduce((a, b) => a + b, 0) / npsValues.length : null;
      const npsDistribution: Record<number, number> = {};
      for (let i = 1; i <= 10; i++) npsDistribution[i] = 0;
      npsValues.forEach((v) => { npsDistribution[v] = (npsDistribution[v] || 0) + 1; });

      // Q6: Additional feedback (text)
      const additionalFeedback = rows
        .map((r) => r.additional_feedback)
        .filter((v): v is string => !!v && v.trim().length > 0);

      return {
        totalResponses: total,
        completedCount,
        dismissedCount,
        avgNps,
        avgImageQuality,
        npsDistribution,
        imageQualityDistribution,
        easeOfUseCounts,
        usefulnessCounts,
        additionalFeedback,
      };
    },
  });
}
