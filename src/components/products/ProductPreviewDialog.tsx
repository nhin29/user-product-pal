import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Product } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Calendar, Tag, Monitor, Layers, Star, StickyNote, UserCircle } from "lucide-react";

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

interface Review {
  id: string;
  rating: number;
  created_at: string;
  user_id: string;
}

function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      if (!productId) return [];
      // Get generated_image_ids for this product, then fetch their reviews
      const { data: images } = await supabase
        .from("generated_images")
        .select("id")
        .eq("product_id", productId);
      if (!images || images.length === 0) return [];
      const imageIds = images.map((i) => i.id);
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, created_at, user_id")
        .in("generated_image_id", imageIds);
      if (error) throw error;
      return (data || []) as Review[];
    },
    enabled: !!productId,
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function ProductPreviewDialog({ open, onOpenChange, product }: ProductPreviewDialogProps) {
  const { data: reviews = [], isLoading: reviewsLoading } = useProductReviews(product?.id);

  if (!product) return null;

  const categoryName = (product as any).categories?.name || "Uncategorized";
  const productTypeName = (product as any).product_types?.name || "—";
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product Preview</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Images Grid */}
          <div>
            {(product.image_urls || []).length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {(product.image_urls || []).map((url, index) => (
                  <div
                    key={index}
                    className="relative group aspect-square overflow-hidden rounded-lg border bg-muted cursor-pointer"
                    onClick={() => window.open(url, "_blank")}
                  >
                    <img
                      src={url}
                      alt={`Product image ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center aspect-video w-full rounded-lg border bg-muted text-muted-foreground">
                No images
              </div>
            )}
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
              <UserCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Made By</p>
                <p className="text-sm font-medium">{product.made_by || "—"}</p>
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

          {/* Note Section */}
          {product.note && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Note
              </h3>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm text-foreground whitespace-pre-wrap">{product.note}</p>
              </div>
            </div>
          )}

          {/* Prompt with scroll */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Image Prompt</h3>
            <ScrollArea className="h-24 rounded-lg bg-muted/50 border">
              <div className="p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">{product.prompt}</p>
              </div>
            </ScrollArea>
          </div>

          {/* Average Rating */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Star className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Average Rating</p>
              {reviewsLoading ? (
                <p className="text-sm font-medium">Loading...</p>
              ) : reviews.length === 0 ? (
                <p className="text-sm font-medium">No ratings yet</p>
              ) : (
                <div className="flex items-center gap-2">
                  <StarRating rating={Math.round(averageRating)} />
                  <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({reviews.length})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
