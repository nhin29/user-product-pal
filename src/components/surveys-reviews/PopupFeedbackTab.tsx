import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function PopupFeedbackTab() {
  return (
    <Card>
      <CardContent className="py-16 text-center text-muted-foreground">
        <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-30" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Pop-up Feedback</h3>
        <p className="text-sm max-w-md mx-auto">
          This section will display aggregated results from the feedback quiz pop-up 
          that appears after users spend 10 minutes on the platform.
        </p>
        <p className="text-xs mt-4 text-muted-foreground/70">Coming soon — charts, graphs, and compiled response data.</p>
      </CardContent>
    </Card>
  );
}
