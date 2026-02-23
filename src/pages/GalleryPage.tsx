import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGallery } from "@/hooks/useGallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Images, Star, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GalleryImage } from "@/hooks/useGallery";

export default function GalleryPage() {
  const { images, isLoading } = useGallery();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GalleryImage | null>(null);

  const filtered = images.filter(
    (img) =>
      img.user_name.toLowerCase().includes(search.toLowerCase()) ||
      img.user_email.toLowerCase().includes(search.toLowerCase()) ||
      (img.completed_prompt || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Gallery</h1>
          <p className="text-muted-foreground">All generated images from users</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Images className="h-5 w-5" />
              Images ({filtered.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by user or prompt..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((img) => (
                  <div
                    key={img.id}
                    className="group relative cursor-pointer rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg transition-shadow"
                    onClick={() => setSelected(img)}
                  >
                    <div className="aspect-square">
                      <OptimizedImage
                        src={img.image_url}
                        alt="Generated"
                        width={400}
                        height={400}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 border border-white/30">
                          <AvatarImage src={img.user_avatar || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(img.user_name || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white font-medium truncate">
                          {img.user_name}
                        </span>
                        {img.rating !== null && (
                          <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                            <Star className="h-3 w-3 mr-0.5 fill-yellow-400 text-yellow-400" />
                            {img.rating}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="rounded-xl overflow-hidden border border-border">
                <OptimizedImage
                  src={selected.image_url}
                  alt="Generated"
                  width={800}
                  height={800}
                  className="w-full object-contain max-h-[400px]"
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
                  {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                </span>
              </div>


              {selected.analyzed_url && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Analyzed URL</p>
                  <a
                    href={selected.analyzed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline break-all"
                  >
                    {selected.analyzed_url}
                  </a>
                </div>
              )}

              {selected.product_image && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Origin Product</p>
                  <div className="flex items-start gap-3">
                    <OptimizedImage
                      src={selected.product_image}
                      alt="Product"
                      width={96}
                      height={96}
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
