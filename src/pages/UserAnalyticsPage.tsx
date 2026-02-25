import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MousePointer, Copy, Eye, Clock, Bookmark, Trash2, Star, ImageIcon, Sparkles, MessageSquare } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserAnalytics } from "@/hooks/useUserAnalytics";
import { useUserAnalyticsChart } from "@/hooks/useUserAnalyticsChart";
import { useUsers } from "@/hooks/useUsers";
import { formatDistanceToNow } from "date-fns";
import { ActivityChart } from "@/components/user-analytics/ActivityChart";
import { OnboardingResponseCard } from "@/components/user-analytics/OnboardingResponseCard";
import { ClearAnalyticsDialog } from "@/components/user-analytics/ClearAnalyticsDialog";
import { GeneratedImageDetailDialog } from "@/components/user-analytics/GeneratedImageDetailDialog";
import { UserFeedbackCard } from "@/components/user-analytics/UserFeedbackCard";
import { OptimizedImage } from "@/components/ui/optimized-image";
import type { GeneratedImageWithRating } from "@/hooks/useUserAnalytics";
const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  isLoading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
}) => (
  <Card className="relative overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      )}
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case "navigation":
    case "pageview":
      return <Eye className="h-4 w-4 text-blue-500" />;
    case "interaction":
    case "click":
      return <MousePointer className="h-4 w-4 text-green-500" />;
    case "prompt":
    case "copy":
      return <Copy className="h-4 w-4 text-purple-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getEventDescription = (event: { event_type: string; event_name: string; page_path: string | null }) => {
  if (event.event_type === "navigation" || event.event_type === "pageview") {
    return `Viewed ${event.page_path || "a page"}`;
  }
  if (event.event_name === "prompt_click") {
    return "Clicked on a prompt";
  }
  if (event.event_name === "prompt_copy") {
    return "Copied a prompt";
  }
  return event.event_name || event.event_type;
};

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
};

export default function UserAnalyticsPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState("7d");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImageWithRating | null>(null);
  const { users } = useUsers();
  const {
    stats,
    isLoadingStats,
    productInteractions,
    isLoadingProducts,
    recentActivity,
    isLoadingActivity,
    onboardingResponse,
    isLoadingOnboarding,
    generatedImages,
    isLoadingGeneratedImages,
    clearAnalytics,
  } = useUserAnalytics(userId || "");
  const { data: chartData, isLoading: isLoadingChart } = useUserAnalyticsChart(userId || "", chartPeriod);
  
  const user = users.find((u) => u.user_id === userId);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/users")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name || "User"}
                  loading="lazy"
                  decoding="async"
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-2 ring-border">
                  <span className="text-xl font-semibold text-primary">
                    {getInitials(user?.display_name || null)}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold text-foreground">
                    {user?.display_name || "Unknown User"}
                  </h1>
                </div>
                <p className="text-muted-foreground">User Analytics & Activity</p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setClearDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Analytics
            </Button>
          </div>

          <ClearAnalyticsDialog
            userName={user?.display_name || "this user"}
            open={clearDialogOpen}
            onOpenChange={setClearDialogOpen}
            onConfirm={async () => {
              await clearAnalytics.mutateAsync();
            }}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
          <StatCard
            title="Total Clicks"
            value={stats?.totalClicks || 0}
            icon={MousePointer}
            description="Product prompt clicks"
            isLoading={isLoadingStats}
          />
          <StatCard
            title="Total Copies"
            value={stats?.totalCopies || 0}
            icon={Copy}
            description="Prompt copies"
            isLoading={isLoadingStats}
          />
          <StatCard
            title="Total Saves"
            value={stats?.totalSaves || 0}
            icon={Bookmark}
            description="Saved prompts"
            isLoading={isLoadingStats}
          />
          <StatCard
            title="Page Views"
            value={stats?.totalPageViews || 0}
            icon={Eye}
            description="Pages visited"
            isLoading={isLoadingStats}
          />
          <StatCard
            title="Total Spend Time"
            value={formatTime(stats?.totalSpendTimeSeconds || 0)}
            icon={Clock}
            description="Time spent on platform"
            isLoading={isLoadingStats}
          />
          <StatCard
            title="Generations"
            value={stats?.totalGenerations || 0}
            icon={Sparkles}
            description="Images generated"
            isLoading={isLoadingStats}
          />
        </div>

        {/* Activity Chart */}
        <div className="mb-8">
          <ActivityChart
            data={chartData || []}
            isLoading={isLoadingChart}
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
            showNewCustomers={false}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Product Interactions */}
          <Card>
            <CardHeader>
              <CardTitle>Product Interactions</CardTitle>
              <CardDescription>
                Products this user has interacted with
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              {isLoadingProducts ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : productInteractions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MousePointer className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No product interactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {productInteractions.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <OptimizedImage
                        src={product.image_url}
                        alt="Product"
                        width={96}
                        height={96}
                        className="h-12 w-12 rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {product.category_name && (
                            <span className="text-sm font-medium text-foreground">{product.category_name}</span>
                          )}
                          {product.platform && (
                            <span className="text-xs capitalize text-muted-foreground">· {product.platform}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MousePointer className="h-3 w-3" />
                            {product.clicks} clicks
                          </span>
                          <span className="flex items-center gap-1">
                            <Copy className="h-3 w-3" />
                            {product.copies} copies
                          </span>
                          <span className="flex items-center gap-1">
                            <Bookmark className="h-3 w-3" />
                            {product.saves} saves
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest events from this user
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              {isLoadingActivity ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-40 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No activity recorded</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentActivity.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        {getEventIcon(event.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {getEventDescription(event)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Generated Images with Ratings */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Generated Images</CardTitle>
              <CardDescription>Images generated by this user with their ratings</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingGeneratedImages ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-square rounded-lg" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : generatedImages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No generated images yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {generatedImages.map((image) => (
                    <div key={image.id} className="group space-y-2">
                      <div
                        className="relative aspect-square overflow-hidden rounded-lg border bg-muted cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                      >
                        <OptimizedImage
                          src={image.image_url}
                          alt="Generated"
                          width={200}
                          height={200}
                          className="h-full w-full transition-transform group-hover:scale-105"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        {image.rating !== null ? (
                          <>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-3.5 w-3.5 ${
                                  s <= image.rating!
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">No rating</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Onboarding & Feedback Tabs */}
        <div className="mt-8">
          <Tabs defaultValue="onboarding">
            <TabsList>
              <TabsTrigger value="onboarding">Onboarding Responses</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
            </TabsList>
            <TabsContent value="onboarding">
              <OnboardingResponseCard
                data={onboardingResponse || null}
                isLoading={isLoadingOnboarding}
              />
            </TabsContent>
            <TabsContent value="feedback">
              <UserFeedbackCard userId={userId || ""} />
            </TabsContent>
          </Tabs>
        </div>

        <GeneratedImageDetailDialog
          image={selectedImage}
          open={!!selectedImage}
          onOpenChange={(open) => !open && setSelectedImage(null)}
        />
      </div>
    </AdminLayout>
  );
}
