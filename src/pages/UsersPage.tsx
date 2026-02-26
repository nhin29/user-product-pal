import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MoreHorizontal, Edit, Trash2, Loader2, BarChart3, Check, X, Hand, Shield, User, Plus, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers, UserProfile } from "@/hooks/useUsers";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { DeleteUserDialog } from "@/components/users/DeleteUserDialog";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { formatNY } from "@/lib/dateUtils";

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const PAGE_SIZES = [10, 20, 50, 100];

type SortField = "display_name" | "email" | "created_at" | "role" | "last_active";
type SortDirection = "asc" | "desc";

export default function UsersPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [deleteUserData, setDeleteUserData] = useState<UserProfile | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const { users, isLoading, error, deleteUser, updateUserProfile, createUser } = useUsers();

  // Credits data
  const [userCredits, setUserCredits] = useState<Record<string, { credit_limit: number; used_count: number; status: string }>>({});
  const [powerUsers, setPowerUsers] = useState<Set<string>>(new Set());
  const [lastActive, setLastActive] = useState<Record<string, string>>({});

  useEffect(() => {
    if (users.length === 0) return;

    // Fetch credits
    supabase
      .from("user_credits")
      .select("user_id, credit_limit, used_count, status")
      .then(({ data }) => {
        if (data) {
          const map: Record<string, { credit_limit: number; used_count: number; status: string }> = {};
          data.forEach((c) => { map[c.user_id] = { credit_limit: c.credit_limit, used_count: c.used_count, status: (c as any).status ?? 'trial' }; });
          setUserCredits(map);
        }
      });

    // Fetch copy counts + generation counts to determine power users (10+)
    Promise.all([
      supabase
        .from("prompt_interactions")
        .select("user_id")
        .eq("interaction_type", "copy"),
      supabase
        .from("generated_images")
        .select("user_id"),
    ]).then(([copiesRes, gensRes]) => {
      const counts: Record<string, number> = {};
      copiesRes.data?.forEach((r) => {
        if (r.user_id) counts[r.user_id] = (counts[r.user_id] || 0) + 1;
      });
      gensRes.data?.forEach((r) => {
        if (r.user_id) counts[r.user_id] = (counts[r.user_id] || 0) + 1;
      });
      const set = new Set<string>();
      Object.entries(counts).forEach(([uid, count]) => {
        if (count > 10) set.add(uid);
      });
      setPowerUsers(set);
    });

    // Fetch last active dates (paginate to bypass 1000-row limit)
    const fetchAllLastActive = async () => {
      const map: Record<string, string> = {};
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data } = await supabase
          .from("daily_time_tracking")
          .select("user_id, date")
          .order("date", { ascending: false })
          .range(offset, offset + batchSize - 1);
        if (data && data.length > 0) {
          data.forEach((r) => {
            if (!map[r.user_id]) map[r.user_id] = r.date;
          });
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      setLastActive(map);
    };
    fetchAllLastActive();
  }, [users]);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [purchaseFilter, setPurchaseFilter] = useState<string>("all");
  
  const [powerUserFilter, setPowerUserFilter] = useState(false);

  // Sort
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const processedUsers = useMemo(() => {
    let result = users.filter(
      (user) =>
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply filters
    if (roleFilter !== "all") {
      result = result.filter((u) => (roleFilter === "admin" ? u.role === "admin" : u.role !== "admin"));
    }
    if (purchaseFilter !== "all") {
      result = result.filter((u) => {
        if (purchaseFilter === "purchased") return u.is_purchase && !u.is_refund;
        if (purchaseFilter === "refunded") return u.is_refund;
        if (purchaseFilter === "manual") return !u.is_purchase && u.product_ids && u.product_ids.length > 0;
        return !u.is_purchase && (!u.product_ids || u.product_ids.length === 0);
      });
    }
    if (powerUserFilter) {
      result = result.filter((u) => powerUsers.has(u.user_id));
    }

    // Apply sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "display_name":
          cmp = (a.display_name || "").localeCompare(b.display_name || "");
          break;
        case "email":
          cmp = (a.email || "").localeCompare(b.email || "");
          break;
        case "created_at":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "role":
          cmp = (a.role || "viewer").localeCompare(b.role || "viewer");
          break;
        case "last_active":
          cmp = new Date(lastActive[a.user_id] || "1970-01-01").getTime() - new Date(lastActive[b.user_id] || "1970-01-01").getTime();
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [users, searchQuery, roleFilter, purchaseFilter, powerUserFilter, powerUsers, sortField, sortDirection, lastActive]);

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(processedUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = processedUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    return sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const handleSaveUser = async (userId: string, displayName: string, email?: string, productIds?: string[], role?: string, isAnalytics?: boolean, isRefund?: boolean, _isNew?: boolean, creditLimit?: number) => {
    await updateUserProfile.mutateAsync({ userId, displayName, email, productIds, role, isAnalytics, isRefund, creditLimit });
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUser.mutateAsync(userId);
  };

  const handleAddUser = async (email: string, password: string, displayName: string) => {
    await createUser.mutateAsync({ email, password, displayName });
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Users</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your team members and their profiles.
            </p>
          </div>
          <Button onClick={() => setShowAddUser(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={purchaseFilter} onValueChange={(v) => { setPurchaseFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Purchase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Purchases</SelectItem>
              <SelectItem value="purchased">Purchased</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="not_purchased">Not Purchased</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={powerUserFilter ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => { setPowerUserFilter((v) => !v); setCurrentPage(1); }}
            title="Filter power users (10+ copies & generations)"
          >
            ⭐ Power
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <p>Error loading users: {error.message}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && processedUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-foreground">No users found</p>
            <p className="mt-1 text-muted-foreground">
              {searchQuery || roleFilter !== "all" || purchaseFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Users will appear here when they sign up"}
            </p>
          </div>
        )}

        {/* Users Table */}
        {!isLoading && !error && paginatedUsers.length > 0 && (
          <>
            <div className="data-table">
              <table className="w-full">
                <thead>
                  <tr className="data-table-header">
                    <th className="px-6 py-3 text-left cursor-pointer select-none" onClick={() => handleSort("display_name")}>
                      <div className="flex items-center">User <SortIcon field="display_name" /></div>
                    </th>
                    <th className="px-6 py-3 text-left cursor-pointer select-none" onClick={() => handleSort("email")}>
                      <div className="flex items-center">Email <SortIcon field="email" /></div>
                    </th>
                    <th className="px-6 py-3 text-left">Access</th>
                    <th className="px-6 py-3 text-left">Platform</th>
                    <th className="px-6 py-3 text-left cursor-pointer select-none" onClick={() => handleSort("created_at")}>
                      <div className="flex items-center">Joined <SortIcon field="created_at" /></div>
                    </th>
                    <th className="px-6 py-3 text-left cursor-pointer select-none" onClick={() => handleSort("last_active")}>
                      <div className="flex items-center">Last Active <SortIcon field="last_active" /></div>
                    </th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr key={user.id} className="data-table-row">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.display_name || "User"}
                              loading="lazy"
                              decoding="async"
                              className={`h-10 w-10 rounded-full object-cover ring-[3px] ring-offset-2 ring-offset-background ${
                                user.role === "admin"
                                  ? "ring-yellow-500"
                                  : "ring-emerald-500"
                              }`}
                            />
                          ) : (
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-[3px] ${
                              user.role === "admin"
                                ? "bg-yellow-500/25 border-yellow-500 text-yellow-700 dark:text-yellow-400"
                                : "bg-emerald-500/25 border-emerald-500 text-emerald-700 dark:text-emerald-400"
                            }`}>
                              <span className="text-sm font-bold">
                                {getInitials(user.display_name)}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-foreground">
                                {user.display_name || "Unnamed User"}
                              </p>
                              {powerUsers.has(user.user_id) && (
                                <span className="text-amber-500" title="Power user: 10+ copies & generations">⭐</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              ID: {user.user_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground">
                          {user.email || "No email"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const credit = userCredits[user.user_id];
                          const isSubscribed = credit?.status === 'subscribed';
                          return (
                            <div className="flex flex-col items-start gap-1">
                              <Badge variant="outline" className="text-[11px] font-semibold px-2 py-0.5 border-yellow-500 text-yellow-700 bg-yellow-500/15 whitespace-nowrap">Prompt</Badge>
                              {isSubscribed && (
                                <Badge variant="outline" className="text-[11px] font-semibold px-2 py-0.5 border-violet-500 text-violet-700 bg-violet-500/15 whitespace-nowrap">Software</Badge>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const amazonIds = ["prod_TreWrcz8uVHqIT", "prod_TreWtW6ekESits", "prod_TreV0wplqggLBW", "prod_TmW6D8HwME3dsX"];
                          const shopifyIds = ["prod_TxMHw09aCtGsOM", "prod_TxzgveYwNQur3j"];
                          const metaIds = ["prod_U1stXv6wWzqBVe", "prod_U1sv6wPAwnrTLZ"];
                          const ids = user.product_ids || [];
                          const hasAmazon = ids.some((id: string) => amazonIds.includes(id));
                          const hasShopify = ids.some((id: string) => shopifyIds.includes(id));
                          const hasMeta = ids.some((id: string) => metaIds.includes(id));
                          if (!hasAmazon && !hasShopify && !hasMeta) return <span className="text-muted-foreground">—</span>;
                          return (
                          <div className="flex flex-col items-start gap-1">
                              {hasAmazon && <Badge variant="outline" className="text-[11px] font-semibold px-2 py-0.5 border-orange-500 text-orange-700 bg-orange-500/15 whitespace-nowrap">Amazon</Badge>}
                              {hasShopify && <Badge variant="outline" className="text-[11px] font-semibold px-2 py-0.5 border-teal-500 text-teal-700 bg-teal-500/15 whitespace-nowrap">Shopify</Badge>}
                              {hasMeta && <Badge variant="outline" className="text-[11px] font-semibold px-2 py-0.5 border-sky-500 text-sky-700 bg-sky-500/15 whitespace-nowrap">Meta</Badge>}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground">
                          {formatNY(user.created_at, "MMM d, yyyy")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground">
                          {lastActive[user.user_id]
                            ? formatNY(lastActive[user.user_id], "MMM d, yyyy")
                            : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem onClick={() => setEditUser(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/users/${user.user_id}/analytics`)}
                            >
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteUserData(user)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((s) => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>of {processedUsers.length} users</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(safePage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm text-muted-foreground">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(safePage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Dialogs */}
        <AddUserDialog
          open={showAddUser}
          onOpenChange={setShowAddUser}
          onAdd={handleAddUser}
          isLoading={createUser.isPending}
        />
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
          onSave={handleSaveUser}
          isLoading={updateUserProfile.isPending}
        />
        <DeleteUserDialog
          user={deleteUserData}
          open={!!deleteUserData}
          onOpenChange={(open) => !open && setDeleteUserData(null)}
          onDelete={handleDeleteUser}
          isLoading={deleteUser.isPending}
        />
      </div>
    </AdminLayout>
  );
}
