import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ClearAnalyticsDialogProps {
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function ClearAnalyticsDialog({ userName, open, onOpenChange, onConfirm }: ClearAnalyticsDialogProps) {
  const [isClearing, setIsClearing] = useState(false);

  const handleConfirm = async () => {
    setIsClearing(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Clear analytics failed:", error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear Analytics Data</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to clear all analytics data for "{userName}"? This will permanently delete all their tracked events and prompt interactions. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isClearing}
          >
            {isClearing ? "Clearing..." : "Clear Analytics"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
