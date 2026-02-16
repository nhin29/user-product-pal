import { useState } from "react";
import { Users, Package, FolderOpen, Layers, MousePointerClick, Copy, Bookmark } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { useDashboardStats, useTopClickedProducts, useTopCopiedProducts, useTopSavedProducts } from "@/hooks/useDashboardStats";
import { useDashboardChart } from "@/hooks/useDashboardChart";
import { ActivityChart } from "@/components/user-analytics/ActivityChart";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [chartPeriod, setChartPeriod] = useState("7d");
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: topClicked, isLoading: clickedLoading } = useTopClickedProducts();
  const { data: topCopied, isLoading: copiedLoading } = useTopCopiedProducts();
  const { data: topSaved, isLoading: savedLoading } = useTopSavedProducts();
  const { data: chartData, isLoading: chartLoading } = useDashboardChart(chartPeriod);

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
      title: "Total Clicks",
      value: stats?.totalClicks || 0,
      icon: MousePointerClick,
    },
    {
      title: "Total Copies",
      value: stats?.totalCopies || 0,
      icon: Copy,
    },
    {
      title: "Total Saves",
      value: stats?.totalSaves || 0,
      icon: Bookmark,
    },
  ];

  const ProductList = ({ 
    products, 
    isLoading, 
    emptyMessage 
  }: { 
    products?: { id: string; image_url: string; count: number }[];
    isLoading: boolean;
    emptyMessage: string;
  }) => {
    if (isLoading) {
      return (
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          ))}
        </div>
      );
    }

    if (!products || products.length === 0) {
      return (
        <div className="px-6 py-8 text-center text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="divide-y divide-border">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {index + 1}
            </div>
            <img
              src={product.image_url}
              alt="Product"
              loading="lazy"
              decoding="async"
              className="h-12 w-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0" />
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1">
              <span className="text-sm font-semibold text-primary">
                {product.count}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Product analytics and performance overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {statsLoading
            ? Array.from({ length: 7 }).map((_, index) => (
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

        {/* Activity Chart */}
        <div className="mb-8">
          <ActivityChart
            data={chartData || []}
            isLoading={chartLoading}
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
          />
        </div>

        {/* Top Products Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Most Clicked Products */}
          <div className="data-table">
            <div className="border-b border-border px-6 py-4 flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Most Clicked Products
              </h2>
            </div>
            <ProductList
              products={topClicked}
              isLoading={clickedLoading}
              emptyMessage="No click data yet."
            />
          </div>

          {/* Most Copied Products */}
          <div className="data-table">
            <div className="border-b border-border px-6 py-4 flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Most Copied Products
              </h2>
            </div>
            <ProductList
              products={topCopied}
              isLoading={copiedLoading}
              emptyMessage="No copy data yet."
            />
          </div>

          {/* Most Saved Products */}
          <div className="data-table">
            <div className="border-b border-border px-6 py-4 flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Most Saved Products
              </h2>
            </div>
            <ProductList
              products={topSaved}
              isLoading={savedLoading}
              emptyMessage="No save data yet."
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
