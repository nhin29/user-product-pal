import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MousePointer, Copy, Eye, Activity, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserAnalytics } from "@/hooks/useUserAnalytics";
import { useUsers } from "@/hooks/useUsers";
import { format, formatDistanceToNow } from "date-fns";

const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  isLoading,
}: {
  title: string;
  value: number;
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
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      )}
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case "pageview":
      return <Eye className="h-4 w-4 text-blue-500" />;
    case "click":
      return <MousePointer className="h-4 w-4 text-green-500" />;
    case "copy":
      return <Copy className="h-4 w-4 text-purple-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
};

const getEventDescription = (event: { event_type: string; event_name: string; page_path: string | null }) => {
  if (event.event_type === "pageview") {
    return `Viewed ${event.page_path || "a page"}`;
  }
  return event.event_name || event.event_type;
};

export default function UserAnalyticsPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users } = useUsers();
  const {
    stats,
    isLoadingStats,
    productInteractions,
    isLoadingProducts,
    recentActivity,
    isLoadingActivity,
  } = useUserAnalytics(userId || "");

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

          <div className="flex items-center gap-4">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name || "User"}
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
              <h1 className="text-2xl font-semibold text-foreground">
                {user?.display_name || "Unknown User"}
              </h1>
              <p className="text-muted-foreground">User Analytics & Activity</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
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
            title="Page Views"
            value={stats?.totalPageViews || 0}
            icon={Eye}
            description="Pages visited"
            isLoading={isLoadingStats}
          />
          <StatCard
            title="Total Events"
            value={stats?.totalEvents || 0}
            icon={Activity}
            description="All tracked events"
            isLoading={isLoadingStats}
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
            <CardContent>
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
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {product.title}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MousePointer className="h-3 w-3" />
                            {product.clicks} clicks
                          </span>
                          <span className="flex items-center gap-1">
                            <Copy className="h-3 w-3" />
                            {product.copies} copies
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
            <CardContent>
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
                  <Activity className="mx-auto h-8 w-8 mb-2 opacity-50" />
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
      </div>
    </AdminLayout>
  );
}
