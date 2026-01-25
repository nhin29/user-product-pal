import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product } from "@/hooks/useProducts";
import { ExternalLink, Calendar, Tag, Monitor, Layers } from "lucide-react";

interface ProductPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

const platformColors: Record<string, string> = {
  amazon: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  shopify: "bg-green-500/10 text-green-500 border-green-500/20",
  meta: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  other: "bg-muted text-muted-foreground",
};

export function ProductPreviewDialog({ open, onOpenChange, product }: ProductPreviewDialogProps) {
  if (!product) return null;

  const categoryName = (product as any).categories?.name || "Uncategorized";
  const productTypeName = (product as any).product_types?.name || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product Preview</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Image */}
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
            <img
              src={product.image_url}
              alt={product.title}
              className="h-full w-full object-cover"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute bottom-3 right-3 gap-2"
              onClick={() => window.open(product.image_url, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              Open Full Size
            </Button>
          </div>

          {/* Title and Badges */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">{product.title}</h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{categoryName}</Badge>
              <Badge
                variant="outline"
                className={platformColors[product.platform] || platformColors.other}
              >
                {product.platform}
              </Badge>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Layers className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Product Type</p>
                <p className="text-sm font-medium">{productTypeName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Monitor className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Platform</p>
                <p className="text-sm font-medium capitalize">{product.platform}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="text-sm font-medium">{categoryName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium">
                  {new Date(product.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
              <p className="text-sm text-foreground">{product.description}</p>
            </div>
          )}

          {/* Prompt */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Image Prompt</h3>
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-foreground whitespace-pre-wrap">{product.prompt}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
