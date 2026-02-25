import { Card, CardContent } from "@/components/ui/card";
import { ReceiptText } from "lucide-react";

export default function RefundQuestionnaireTab() {
  return (
    <Card>
      <CardContent className="py-16 text-center text-muted-foreground">
        <ReceiptText className="mx-auto h-12 w-12 mb-4 opacity-30" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Refund Questionnaire</h3>
        <p className="text-sm max-w-md mx-auto">
          This section will display compiled responses from the refund-related questionnaire, 
          including chart visualizations and aggregated answer data.
        </p>
        <p className="text-xs mt-4 text-muted-foreground/70">Coming soon — analytics and response breakdown.</p>
      </CardContent>
    </Card>
  );
}
