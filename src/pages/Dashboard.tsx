import { Users, Package, FolderOpen, Layers, Eye, MousePointerClick, Copy, Activity } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { useDashboardStats, useRecentActivity } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useRecentActivity();

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
    },
    {
      title: "Total Products",
      value: stats?.totalProducts || 0,
      icon: Package,
    },
    {
      title: "Categories",
      value: stats?.totalCategories || 0,
      icon: FolderOpen,
    },
    {
      title: "Niches",
      value: stats?.totalProductTypes || 0,
      icon: Layers,
    },
    {
      title: "Page Views",
      value: stats?.pageViews || 0,
      icon: Eye,
    },
    {
      title: "Total Events",
      value: stats?.totalEvents || 0,
      icon: Activity,
    },
    {
      title: "Prompt Clicks",
      value: stats?.totalInteractions || 0,
      icon: MousePointerClick,
    },
    {
      title: "Prompt Copies",
      value: stats?.promptCopies || 0,
      icon: Copy,
    },
  ];

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "navigation":
        return "🧭";
      case "prompt":
        return "📋";
      case "interaction":
        return "👆";
      default:
        return "📊";
    }
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Real-time analytics from your database.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading
            ? Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="stat-card animate-fade-in">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))
            : statCards.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
        </div>

        {/* Recent Activity */}
        <div className="data-table">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-border">
            {activitiesLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              ))
            ) : activities && activities.length > 0 ? (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-lg">
                        {getEventIcon(activity.eventType)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {activity.user}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.action}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-muted-foreground">
                No recent activity found.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
