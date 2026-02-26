import { useQuery } from "@tanstack/react-query";
import { toLocaleDateStringNY } from "@/lib/dateUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Product, useProductTypes } from "@/hooks/useProducts";
import { useProductImages } from "@/hooks/useProductImages";
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
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function ProductPreviewDialog({ open, onOpenChange, product }: ProductPreviewDialogProps) {
  const { data: reviews = [], isLoading: reviewsLoading } = useProductReviews(product?.id);
  const { data: productImages = [] } = useProductImages(product?.id);
  const { data: productTypes } = useProductTypes();

  if (!product) return null;

  const categoryName = (product as any).categories?.name || "Uncategorized";
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Build a niche name lookup
  const nicheMap = new Map(productTypes?.map(t => [t.id, t.name]) || []);

  // Use product_images if available, fallback to image_urls
  const displayImages = productImages.length > 0
    ? productImages.map(img => ({ url: img.image_url, niche: nicheMap.get(img.niche_id || "") || null }))
    : (product.image_urls || []).map(url => ({ url, niche: null }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product Preview</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Images Grid with niche badges */}
          <div>
            {displayImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {displayImages.map((img, index) => (
                  <div
                    key={index}
                    className="relative group aspect-square overflow-hidden rounded-lg border bg-muted cursor-pointer"
                    onClick={() => window.open(img.url, "_blank")}
                  >
                    <img
                      src={img.url}
                      alt={`Product image ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    {img.niche && (
                      <Badge variant="secondary" className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5">
                        {img.niche}
                      </Badge>
                    )}
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
              <Monitor className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Platform</p>
                <p className="text-sm font-medium capitalize">{product.platform}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Image Style</p>
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
                <p className="text-sm font-medium">{toLocaleDateStringNY(product.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Note */}
          {product.note && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <StickyNote className="h-4 w-4" /> Note
              </h3>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm text-foreground whitespace-pre-wrap">{product.note}</p>
              </div>
            </div>
          )}

          {/* Prompt */}
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
