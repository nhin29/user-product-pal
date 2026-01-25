import { useState } from "react";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Loader2, FolderOpen } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCategories, Category } from "@/hooks/useCategories";
import { AddCategoryDialog } from "@/components/categories/AddCategoryDialog";
import { EditCategoryDialog } from "@/components/categories/EditCategoryDialog";
import { DeleteCategoryDialog } from "@/components/categories/DeleteCategoryDialog";

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const { data: categories, isLoading, error } = useCategories();

  const filteredCategories = categories?.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setEditDialogOpen(true);
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Categories</h1>
            <p className="mt-1 text-muted-foreground">
              Manage product categories and organization.
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive">Failed to load categories</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No categories found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories?.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <FolderOpen className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">
                            {category.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{category.slug}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm line-clamp-2">
                          {category.description || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {new Date(category.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(category)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(category)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dialogs */}
        <AddCategoryDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
        <EditCategoryDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          category={selectedCategory}
        />
        <DeleteCategoryDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          category={selectedCategory}
        />
      </div>
    </AdminLayout>
  );
}
