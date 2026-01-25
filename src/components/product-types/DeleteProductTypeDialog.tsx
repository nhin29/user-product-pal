import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteProductType, ProductType } from "@/hooks/useProductTypes";
import { useToast } from "@/hooks/use-toast";

interface DeleteProductTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productType: ProductType | null;
}

export function DeleteProductTypeDialog({ open, onOpenChange, productType }: DeleteProductTypeDialogProps) {
  const { toast } = useToast();
  const deleteProductType = useDeleteProductType();

  const handleDelete = async () => {
    if (!productType) return;

    try {
      await deleteProductType.mutateAsync(productType.id);

      toast({
        title: "Product type deleted",
        description: "The product type has been deleted successfully.",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message?.includes("violates foreign key") 
          ? "Cannot delete product type. It is being used by products."
          : "Failed to delete product type. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Product Type</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{productType?.name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteProductType.isPending}
          >
            {deleteProductType.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
