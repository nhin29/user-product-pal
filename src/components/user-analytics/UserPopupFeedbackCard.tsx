import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Star } from "lucide-react";
import { formatDistanceToNowNY } from "@/lib/dateUtils";
import {
  easeOfUseLabels,
  usefulnessLabels,
} from "@/hooks/usePopupFeedbackAnalytics";

interface UserPopupFeedbackProps {
  userId: string;
}

export function UserPopupFeedbackCard({ userId }: UserPopupFeedbackProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["user-popup-feedback", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_questionnaire")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p>No pop-up feedback from this user</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((fb) => (
        <Card key={fb.id} className="overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <span className="text-sm font-semibold">
              {fb.completed_at ? "Completed" : fb.dismissed_at ? "Dismissed" : "In Progress"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNowNY(fb.created_at, { addSuffix: true })}
            </span>
          </div>
          <div className="divide-y">
            {/* Q1: Image Quality */}
            {fb.image_quality_rating !== null && (
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">Image Quality</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s <= fb.image_quality_rating!
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Q2: Ease of Use */}
            {fb.ease_of_use && (
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">Ease of Use</span>
                <span className="text-sm font-medium">{easeOfUseLabels[fb.ease_of_use] || fb.ease_of_use}</span>
              </div>
            )}

            {/* Q3: Improvements */}
            {fb.improvements && fb.improvements.length > 0 && (
              <div className="px-6 py-3">
                <span className="text-sm text-muted-foreground">Would be more useful with</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {fb.improvements.map((item) => (
                    <span key={item} className="text-xs font-medium bg-muted px-2.5 py-1 rounded-md border">
                      {usefulnessLabels[item] || item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Q4: NPS */}
            {fb.nps_score !== null && (
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">Recommendation Score</span>
                <span className="text-sm font-medium">{fb.nps_score} / 10</span>
              </div>
            )}

            {/* Q5: Additional Feedback */}
            {fb.additional_feedback && (
              <div className="px-6 py-3">
                <span className="text-sm text-muted-foreground">Additional Feedback</span>
                <p className="text-sm mt-1.5 p-3 bg-muted/50 rounded-lg">{fb.additional_feedback}</p>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
