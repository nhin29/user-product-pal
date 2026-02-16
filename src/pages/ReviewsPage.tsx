import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useProjectReviews, useDeleteProjectReviews, type ProjectReview } from "@/hooks/useProjectReviews";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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

export default function ReviewsPage() {
  const { data: reviews = [], isLoading } = useProjectReviews();
  const deleteReviews = useDeleteProjectReviews();
  const { toast } = useToast();
  const [selectedReview, setSelectedReview] = useState<ProjectReview | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(reviews.length / pageSize));
  const paginatedReviews = reviews.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pageIds = paginatedReviews.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...pageIds]));
    }
  };

  const handleDelete = async (ids: string[]) => {
    try {
      await deleteReviews.mutateAsync(ids);
      toast({ title: "Deleted", description: `${ids.length} review(s) deleted.` });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      if (selectedReview && ids.includes(selectedReview.id)) {
        setSelectedReview(null);
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete reviews." });
    }
    setConfirmDeleteIds([]);
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Project Reviews</h1>
          <p className="mt-1 text-muted-foreground">
            User feedback and ratings for the project.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold">{reviews.length}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
                  <StarRating rating={Math.round(averageRating)} />
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-3 w-full" />)}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {ratingDistribution.map(({ star, count }) => {
                    const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-sm">
                        <span className="w-3 text-muted-foreground">{star}</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Reviews</CardTitle>
                <CardDescription>User reviews sorted by most recent</CardDescription>
              </div>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDeleteIds(Array.from(selectedIds))}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedIds.size})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="mx-auto h-10 w-10 mb-3 opacity-40" />
                <p className="font-medium">No reviews yet</p>
                <p className="text-sm mt-1">Reviews will appear here when users submit feedback.</p>
              </div>
            ) : (
              <>
                {/* Select all */}
                <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size > 0
                      ? `${selectedIds.size} of ${reviews.length} selected`
                      : "Select all on page"}
                  </span>
                </div>

                <div className="space-y-3">
                  {paginatedReviews.map((review) => (
                    <div
                      key={review.id}
                      className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(review.id)}
                          onCheckedChange={() => toggleSelect(review.id)}
                        />
                      </div>
                      <div
                        className="flex items-start gap-4 flex-1 min-w-0 cursor-pointer"
                        onClick={() => setSelectedReview(review)}
                      >
                        {review.avatar_url ? (
                          <img
                            src={review.avatar_url}
                            alt={review.display_name || "User"}
                            loading="lazy"
                            decoding="async"
                            className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 ring-1 ring-border shrink-0">
                            <span className="text-sm font-semibold text-primary">
                              {review.display_name?.[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {review.display_name || "Anonymous"}
                              </span>
                              <StarRating rating={review.rating} />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="mt-1.5 text-sm text-foreground/80 truncate">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Rows per page</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        setPageSize(Number(v));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 50].map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Review Detail Modal */}
        <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Review Details</DialogTitle>
            </DialogHeader>
            {selectedReview && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {selectedReview.avatar_url ? (
                    <img
                      src={selectedReview.avatar_url}
                      alt={selectedReview.display_name || "User"}
                      loading="lazy"
                      decoding="async"
                      className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-border">
                      <span className="text-base font-semibold text-primary">
                        {selectedReview.display_name?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground">
                      {selectedReview.display_name || "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(selectedReview.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StarRating rating={selectedReview.rating} />
                  <span className="text-sm text-muted-foreground">{selectedReview.rating}/5</span>
                </div>

                {selectedReview.comment ? (
                  <div className="rounded-lg bg-muted/50 border p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedReview.comment}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No comment provided.</p>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setConfirmDeleteIds([selectedReview.id]);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Review
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={confirmDeleteIds.length > 0} onOpenChange={(open) => !open && setConfirmDeleteIds([])}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {confirmDeleteIds.length === 1 ? "Review" : "Reviews"}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {confirmDeleteIds.length === 1 ? "this review" : `${confirmDeleteIds.length} reviews`}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteReviews.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(confirmDeleteIds)}
                disabled={deleteReviews.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteReviews.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
