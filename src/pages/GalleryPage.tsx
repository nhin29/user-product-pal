import { useState, useCallback } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGallery } from "@/hooks/useGallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { Images, Star, Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNowNY } from "@/lib/dateUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GalleryImage } from "@/hooks/useGallery";

const PAGE_SIZE = 20;

export default function GalleryPage() {
  const { images, isLoading } = useGallery();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GalleryImage | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortBy, setSortBy] = useState<string>("newest");

  const filtered = images
    .filter(
      (img) =>
        img.user_name.toLowerCase().includes(search.toLowerCase()) ||
        img.user_email.toLowerCase().includes(search.toLowerCase()) ||
        (img.completed_prompt || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "rating_high":
          return (b.rating ?? 0) - (a.rating ?? 0);
        case "rating_low":
          return (a.rating ?? 0) - (b.rating ?? 0);
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Gallery</h1>
          <p className="text-muted-foreground">All generated images from users</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Images className="h-5 w-5" />
              Images ({filtered.length})
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44">
                  <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="rating_high">Rating: High → Low</SelectItem>
                  <SelectItem value="rating_low">Rating: Low → High</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by user or prompt..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Images className="mx-auto h-10 w-10 mb-3 opacity-50" />
                <p>No generated images found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {visible.map((img) => (
                    <div
                      key={img.id}
                      className="group relative cursor-pointer rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg transition-shadow"
                      onClick={() => setSelected(img)}
                    >
                      <div className="aspect-square">
                        <OptimizedImage
                          src={img.image_url}
                          alt="Generated"
                          width={300}
                          height={300}
                          className="h-full w-full object-cover"
                          aspectRatio="square"
                        />
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-card">
                        <Avatar className="h-6 w-6 border border-border shrink-0">
                          <AvatarImage src={img.user_avatar || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(img.user_name || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-foreground truncate">
                          {img.user_name}
                        </span>
                        {img.rating !== null && (
                          <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 shrink-0">
                            <Star className="h-3 w-3 mr-0.5 fill-yellow-400 text-yellow-400" />
                            {img.rating}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <Button variant="outline" onClick={handleLoadMore}>
                      {`Load more (${filtered.length - visibleCount} remaining)`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generated Image Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-border flex items-center justify-center bg-muted">
                <img
                  src={selected.image_url}
                  alt="Generated"
                  loading="eager"
                  className="w-full h-auto object-contain max-h-[500px]"
                />
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={selected.user_avatar || undefined} />
                  <AvatarFallback>
                    {(selected.user_name || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{selected.user_name}</p>
                  <p className="text-xs text-muted-foreground">{selected.user_email}</p>
                </div>
                {selected.rating !== null && (
                  <Badge variant="outline" className="gap-1 ml-2">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {selected.rating}
                  </Badge>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDistanceToNowNY(selected.created_at, { addSuffix: true })}
                </span>
              </div>


              {selected.analyzed_url && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Analyzed URL</p>
                  <a
                    href={selected.analyzed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline truncate block max-w-full"
                  >
                    {(() => {
                      try {
                        const url = new URL(selected.analyzed_url);
                        return url.hostname + url.pathname.slice(0, 30) + (selected.analyzed_url.length > url.hostname.length + 30 ? "…" : "");
                      } catch {
                        return selected.analyzed_url.slice(0, 50) + "…";
                      }
                    })()}
                  </a>
                </div>
              )}

              {(() => {
                const fv = selected.field_values as Record<string, unknown> | null;
                const originSrc = selected.origin_image || 
                  (fv ? Object.values(fv).find((v) => typeof v === "string" && v.startsWith("https://")) as string | undefined : undefined);
                return originSrc ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Origin Image</p>
                    <div className="rounded-lg overflow-hidden border border-border bg-muted inline-block">
                      <img
                        src={originSrc}
                        alt="Origin"
                        loading="lazy"
                        className="max-h-[200px] w-auto object-contain"
                      />
                    </div>
                  </div>
                ) : null;
              })()}

              {selected.product_image && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Origin Product</p>
                  <div className="flex items-start gap-3">
                    <img
                      src={selected.product_image}
                      alt="Product"
                      loading="lazy"
                      className="h-16 w-16 rounded-lg object-cover shrink-0"
                    />
                    {selected.product_prompt && (
                      <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2 max-h-[100px] overflow-y-auto">
                        {selected.product_prompt}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
