import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Star, ExternalLink, Calendar, Link2, FileText } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { formatDistanceToNow } from "date-fns";
import type { GeneratedImageWithRating } from "@/hooks/useUserAnalytics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  image: GeneratedImageWithRating | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeneratedImageDetailDialog({ image, open, onOpenChange }: Props) {
  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ["product-detail", image?.product_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, prompt, image_urls, description, platform, category_id")
        .eq("id", image!.product_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!image?.product_id && open,
  });

  if (!image) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generated Image Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Image preview */}
          <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
            <OptimizedImage
              src={image.image_url}
              alt="Generated image"
              className="h-full w-full"
            />
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Rating:</span>
            {image.rating !== null ? (
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${
                      s <= image.rating!
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No rating</span>
            )}
          </div>

          {/* Created at */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span>{formatDistanceToNow(new Date(image.created_at), { addSuffix: true })}</span>
          </div>

          {/* Analyzed URL */}
          {image.analyzed_url && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Link2 className="h-4 w-4" />
                Analyzed URL
              </div>
              <a
                href={image.analyzed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 break-all"
              >
                {image.analyzed_url}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </div>
          )}

          {/* Completed Prompt */}
          {image.completed_prompt && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Completed Prompt
              </div>
              <p className="text-sm bg-muted rounded-lg p-3 whitespace-pre-wrap break-words">
                {image.completed_prompt}
              </p>
            </div>
          )}

          {/* Prompt Snapshot */}
          {image.prompt_snapshot && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Original Prompt Template</div>
              <p className="text-sm bg-muted rounded-lg p-3 whitespace-pre-wrap break-words">
                {image.prompt_snapshot}
              </p>
            </div>
          )}

          {/* Field Values */}
          {image.field_values && typeof image.field_values === "object" && Object.keys(image.field_values as object).length > 0 && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Field Values</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(image.field_values as Record<string, unknown>).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Origin Product */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Origin Product</div>
            {isLoadingProduct ? (
              <Skeleton className="h-16 w-full rounded-lg" />
            ) : product ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                {product.image_urls?.[0] && (
                  <OptimizedImage
                    src={product.image_urls[0]}
                    alt="Product"
                    width={96}
                    height={96}
                    className="h-12 w-12 rounded-lg flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {product.description && (
                    <p className="text-sm font-medium truncate">{product.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs">{product.platform}</Badge>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Product not found</p>
            )}
          </div>

          {/* Image URL */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Image URL</div>
            <a
              href={image.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1 break-all"
            >
              {image.image_url}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
