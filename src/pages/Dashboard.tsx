import { Users, Package, DollarSign, TrendingUp } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/dashboard/StatCard";

const stats = [
  {
    title: "Total Users",
    value: "2,847",
    change: "+12.5%",
    changeType: "positive" as const,
    icon: Users,
  },
  {
    title: "Total Products",
    value: "384",
    change: "+8.2%",
    changeType: "positive" as const,
    icon: Package,
  },
  {
    title: "Revenue",
    value: "$48,352",
    change: "+23.1%",
    changeType: "positive" as const,
    icon: DollarSign,
  },
  {
    title: "Growth",
    value: "18.2%",
    change: "-2.4%",
    changeType: "negative" as const,
    icon: TrendingUp,
  },
];

const recentActivity = [
  { id: 1, user: "Sarah Johnson", action: "Created new product", time: "2 min ago" },
  { id: 2, user: "Michael Chen", action: "Updated user settings", time: "5 min ago" },
  { id: 3, user: "Emily Davis", action: "Deleted product #2847", time: "12 min ago" },
  { id: 4, user: "James Wilson", action: "Added new user", time: "25 min ago" },
  { id: 5, user: "Anna Miller", action: "Updated product pricing", time: "1 hour ago" },
];

export default function Dashboard() {
  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back! Here's what's happening today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
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
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-sm font-medium text-primary">
                      {activity.user
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
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
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
