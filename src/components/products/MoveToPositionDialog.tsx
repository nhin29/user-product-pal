import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface MoveToPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  currentPosition: number;
  totalCount: number;
}

export function MoveToPositionDialog({
  open,
  onOpenChange,
  productId,
  currentPosition,
  totalCount,
}: MoveToPositionDialogProps) {
  const [targetPosition, setTargetPosition] = useState("");
  const queryClient = useQueryClient();

  const moveProduct = useMutation({
    mutationFn: async ({ productId, targetPos }: { productId: string; targetPos: number }) => {
      // Fetch the product at the current position and the target position range
      // We need to shift all products between current and target positions

      const currentPos = currentPosition;
      if (currentPos === targetPos) return;

      const movingUp = targetPos < currentPos; // moving to a lower position number

      // Fetch all products in the affected range, ordered by display_order
      const rangeStart = Math.min(currentPos, targetPos);
      const rangeEnd = Math.max(currentPos, targetPos);

      // We need products with display_order in [rangeStart, rangeEnd]
      const { data: affectedProducts, error: fetchError } = await supabase
        .from("products")
        .select("id, display_order")
        .gte("display_order", rangeStart)
        .lte("display_order", rangeEnd)
        .order("display_order", { ascending: true });

      if (fetchError) throw fetchError;
      if (!affectedProducts || affectedProducts.length === 0) throw new Error("No products found in range");

      // Build the updates
      const updates: { id: string; display_order: number }[] = [];

      for (const product of affectedProducts) {
        if (product.id === productId) {
          // The product being moved goes to targetPos
          updates.push({ id: product.id, display_order: targetPos });
        } else {
          // Other products shift by 1 in the opposite direction
          const newOrder = movingUp
            ? (product.display_order ?? 0) + 1  // shift down (increase)
            : (product.display_order ?? 0) - 1; // shift up (decrease)
          updates.push({ id: product.id, display_order: newOrder });
        }
      }

      // Execute all updates
      const promises = updates.map(({ id, display_order }) =>
        supabase.from("products").update({ display_order }).eq("id", id)
      );

      const results = await Promise.all(promises);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Product moved to position ${targetPosition}`);
      onOpenChange(false);
      setTargetPosition("");
    },
    onError: (error) => {
      toast.error("Failed to move product: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pos = parseInt(targetPosition);
    if (isNaN(pos) || pos < 1 || pos > totalCount) {
      toast.error(`Please enter a position between 1 and ${totalCount}`);
      return;
    }
    if (pos === currentPosition) {
      toast.error("Product is already at this position");
      return;
    }
    if (!productId) return;
    moveProduct.mutate({ productId, targetPos: pos });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Move to Position</DialogTitle>
          <DialogDescription>
            Current position: <strong>#{currentPosition}</strong> of {totalCount}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Label htmlFor="target-position">Target position</Label>
            <Input
              id="target-position"
              type="number"
              min={1}
              max={totalCount}
              value={targetPosition}
              onChange={(e) => setTargetPosition(e.target.value)}
              placeholder={`1 - ${totalCount}`}
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={moveProduct.isPending}>
              {moveProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Move
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
