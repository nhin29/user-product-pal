import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MoreHorizontal, Edit, Trash2, Loader2, BarChart3, Check, X, Hand, Shield, User, Plus } from "lucide-react";
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
import { useUsers, UserProfile } from "@/hooks/useUsers";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { DeleteUserDialog } from "@/components/users/DeleteUserDialog";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { format } from "date-fns";

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function UsersPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [deleteUserData, setDeleteUserData] = useState<UserProfile | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const { users, isLoading, error, deleteUser, updateUserProfile, createUser } = useUsers();

  const filteredUsers = users.filter(
    (user) =>
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveUser = async (userId: string, displayName: string, email?: string, productIds?: string[], role?: string) => {
    await updateUserProfile.mutateAsync({ userId, displayName, email, productIds, role });
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

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
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
        {!isLoading && !error && filteredUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-foreground">No users found</p>
            <p className="mt-1 text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search query"
                : "Users will appear here when they sign up"}
            </p>
          </div>
        )}

        {/* Users Table */}
        {!isLoading && !error && filteredUsers.length > 0 && (
          <div className="data-table">
            <table className="w-full">
              <thead>
                <tr className="data-table-header">
                  <th className="px-6 py-3 text-left">User</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Purchase Status</th>
                  <th className="px-6 py-3 text-left">Joined</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="data-table-row">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.display_name || "User"}
                            loading="lazy"
                            decoding="async"
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <span className="text-sm font-medium text-primary">
                              {getInitials(user.display_name)}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">
                            {user.display_name || "Unnamed User"}
                          </p>
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
                      {user.role === "admin" ? (
                        <Badge variant="default" className="bg-purple-500/20 text-purple-600 border-purple-500/30">
                          <Shield className="mr-1 h-3 w-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          <User className="mr-1 h-3 w-3" />
                          Viewer
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.is_purchase ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                          <Check className="mr-1 h-3 w-3" />
                          Purchased
                        </Badge>
                      ) : user.product_ids && user.product_ids.length > 0 ? (
                        <Badge variant="default" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                          <Hand className="mr-1 h-3 w-3" />
                          Manual
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          <X className="mr-1 h-3 w-3" />
                          Not Purchased
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-muted-foreground">
                        {format(new Date(user.created_at), "MMM d, yyyy")}
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
