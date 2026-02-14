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
import { ExternalLink, Calendar, Tag, Monitor, Layers, Star, User, StickyNote, UserCircle } from "lucide-react";

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
  comment: string | null;
  created_at: string;
  user_id: string;
  display_name?: string | null;
}

function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      // Fetch reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (reviewsError) throw reviewsError;
      if (!reviews || reviews.length === 0) return [];

      // Fetch profiles for review authors
      const userIds = [...new Set(reviews.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      // Merge profile data into reviews
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) ?? []);
      return reviews.map(review => ({
        ...review,
        display_name: profileMap.get(review.user_id) || null,
      })) as Review[];
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
          {/* Images */}
          <div className="space-y-3">
            {(product.image_urls || []).map((url, index) => (
              <div key={index} className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                <img
                  src={url}
                  alt={`Product image ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-3 right-3 gap-2"
                  onClick={() => window.open(url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Full Size
                </Button>
              </div>
            ))}
            {(!product.image_urls || product.image_urls.length === 0) && (
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

          {/* Reviews Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Reviews ({reviews.length})
              </h3>
              {reviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating rating={Math.round(averageRating)} />
                  <span className="text-sm text-muted-foreground">
                    {averageRating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            
            {reviewsLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading reviews...
              </div>
            ) : reviews.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/50 border text-center text-sm text-muted-foreground">
                No reviews yet
              </div>
            ) : (
              <ScrollArea className="h-40">
                <div className="space-y-3 pr-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-3 rounded-lg bg-muted/50 border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {review.display_name || "Anonymous"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <StarRating rating={review.rating} />
                      </div>
                      {review.comment && (
                        <p className="text-sm text-foreground">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
