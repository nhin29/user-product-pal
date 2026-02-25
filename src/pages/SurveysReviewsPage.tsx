import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Star, MessageSquare, ReceiptText } from "lucide-react";
import InitialSurveyTab from "@/components/surveys-reviews/InitialSurveyTab";
import ReviewsTab from "@/components/surveys-reviews/ReviewsTab";
import PopupFeedbackTab from "@/components/surveys-reviews/PopupFeedbackTab";
import RefundQuestionnaireTab from "@/components/surveys-reviews/RefundQuestionnaireTab";

export default function SurveysReviewsPage() {
  const [activeTab, setActiveTab] = useState("initial-survey");

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Surveys & Reviews</h1>
          <p className="mt-1 text-muted-foreground">
            Survey analytics, user feedback, and review management.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="initial-survey" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Initial Survey
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="h-4 w-4" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="popup-feedback" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Pop-up Feedback
            </TabsTrigger>
            <TabsTrigger value="refund" className="gap-2">
              <ReceiptText className="h-4 w-4" />
              Refund Questionnaire
            </TabsTrigger>
          </TabsList>

          <TabsContent value="initial-survey">
            <InitialSurveyTab />
          </TabsContent>
          <TabsContent value="reviews">
            <ReviewsTab />
          </TabsContent>
          <TabsContent value="popup-feedback">
            <PopupFeedbackTab />
          </TabsContent>
          <TabsContent value="refund">
            <RefundQuestionnaireTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
