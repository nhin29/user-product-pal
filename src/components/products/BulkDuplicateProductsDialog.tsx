import { useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface BulkDuplicateProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  onSuccess: () => void;
}

const PLATFORMS = [
  { value: "amazon", label: "Amazon" },
  { value: "shopify", label: "Shopify" },
  { value: "meta", label: "Meta" },
];

export function BulkDuplicateProductsDialog({
  open,
  onOpenChange,
  productIds,
  onSuccess,
}: BulkDuplicateProductsDialogProps) {
  const [platform, setPlatform] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleDuplicate = async () => {
    if (!platform) {
      toast.error("Please select a platform");
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const sourceId of productIds) {
      const { error } = await supabase.functions.invoke("duplicate-product", {
        body: { source_id: sourceId, overrides: { platform } },
      });

      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    setIsLoading(false);
    queryClient.invalidateQueries({ queryKey: ["products"] });

    if (errorCount === 0) {
      toast.success(`Duplicated ${successCount} product(s) to ${platform}`);
    } else {
      toast.warning(`${successCount} duplicated, ${errorCount} failed`);
    }

    setPlatform("");
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate Products</DialogTitle>
          <DialogDescription>
            Duplicate {productIds.length} selected product(s) to a different platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Target Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={isLoading || !platform}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Duplicate ({productIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
