import { useState } from "react";
import { toLocaleDateStringNY } from "@/lib/dateUtils";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Loader2, Layers } from "lucide-react";
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
import { useProductTypes, ProductType } from "@/hooks/useProductTypes";
import { AddProductTypeDialog } from "@/components/product-types/AddProductTypeDialog";
import { EditProductTypeDialog } from "@/components/product-types/EditProductTypeDialog";
import { DeleteProductTypeDialog } from "@/components/product-types/DeleteProductTypeDialog";

export default function ProductTypesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);

  const { data: productTypes, isLoading, error } = useProductTypes();

  const filteredProductTypes = productTypes?.filter((type) =>
    type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (productType: ProductType) => {
    setSelectedProductType(productType);
    setEditDialogOpen(true);
  };

  const handleDelete = (productType: ProductType) => {
    setSelectedProductType(productType);
    setDeleteDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Niche</h1>
            <p className="mt-1 text-muted-foreground">
              Manage niches for product categorization.
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Niche
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search niches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Product Types Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive">Failed to load niches</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Niche</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProductTypes?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No niches found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProductTypes?.map((productType) => (
                    <TableRow key={productType.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Layers className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">
                            {productType.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{productType.slug}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm line-clamp-2">
                          {productType.description || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {toLocaleDateStringNY(productType.created_at)}
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
                            <DropdownMenuItem onClick={() => handleEdit(productType)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(productType)}
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
        <AddProductTypeDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
        <EditProductTypeDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          productType={selectedProductType}
        />
        <DeleteProductTypeDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          productType={selectedProductType}
        />
      </div>
    </AdminLayout>
  );
}
