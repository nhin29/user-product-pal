import { useState, useMemo } from "react";
import { Search, Plus, Trash2, Loader2, ChevronLeft, ChevronRight, Filter, X, GripVertical, FileSpreadsheet } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts, useCategories, useProductTypes, Product, useReorderProducts } from "@/hooks/useProducts";
import { useProductsRealtime } from "@/hooks/useProductsRealtime";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import { EditProductDialog } from "@/components/products/EditProductDialog";
import { DeleteProductDialog } from "@/components/products/DeleteProductDialog";
import { ProductPreviewDialog } from "@/components/products/ProductPreviewDialog";
import { BulkDeleteProductsDialog } from "@/components/products/BulkDeleteProductsDialog";
import { SortableProductRow } from "@/components/products/SortableProductRow";
import { GoogleSheetsSyncDialog } from "@/components/products/GoogleSheetsSyncDialog";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [nicheFilter, setNicheFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading, error } = useProducts(currentPage, pageSize, debouncedSearch, categoryFilter, nicheFilter, platformFilter);
  const { data: categories } = useCategories();
  const { data: productTypes } = useProductTypes();
  const reorderProducts = useReorderProducts();

  // Enable realtime updates for products
  useProductsRealtime();

  const products = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const allSelected = products.length > 0 && products.every((p) => selectedIds.includes(p.id));
  const someSelected = products.some((p) => selectedIds.includes(p.id));

  // Check if any filters are active (drag disabled when filters active)
  const hasActiveFilters = categoryFilter || nicheFilter || platformFilter || debouncedSearch;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Product IDs for sortable context
  const productIds = useMemo(() => products.map((p) => p.id), [products]);

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value === "all" ? "" : value);
    setCurrentPage(1);
  };

  const handleNicheChange = (value: string) => {
    setNicheFilter(value === "all" ? "" : value);
    setCurrentPage(1);
  };

  const handlePlatformChange = (value: string) => {
    setPlatformFilter(value === "all" ? "" : value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setCategoryFilter("");
    setNicheFilter("");
    setPlatformFilter("");
    setSearchQuery("");
    setDebouncedSearch("");
    setCurrentPage(1);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handlePreview = (product: Product) => {
    setSelectedProduct(product);
    setPreviewDialogOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => {
        const newIds = products.map((p) => p.id);
        return [...new Set([...prev, ...newIds])];
      });
    } else {
      setSelectedIds((prev) => prev.filter((id) => !products.some((p) => p.id === id)));
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkDeleteSuccess = () => {
    setSelectedIds([]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Calculate new order values
      const reorderedProducts = [...products];
      const [movedProduct] = reorderedProducts.splice(oldIndex, 1);
      reorderedProducts.splice(newIndex, 0, movedProduct);

      // Calculate base offset for current page
      const baseOrder = (currentPage - 1) * pageSize;

      // Update display_order for all affected products
      const updates = reorderedProducts.map((product, index) => ({
        id: product.id,
        display_order: baseOrder + index + 1,
      }));

      // Fire and forget - optimistic update handles UI immediately
      reorderProducts.mutate(updates);
    }
  };

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Products</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your product catalog and images.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedIds.length})
              </Button>
            )}
            <Button variant="outline" onClick={() => setSyncDialogOpen(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Sync from Sheets
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryFilter || "all"} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={nicheFilter || "all"} onValueChange={handleNicheChange}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Niche" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Niches</SelectItem>
              {productTypes?.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={platformFilter || "all"} onValueChange={handlePlatformChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="amazon">Amazon</SelectItem>
              <SelectItem value="shopify">Shopify</SelectItem>
              <SelectItem value="meta">Meta</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Drag hint */}
        {!hasActiveFilters && products.length > 1 && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <GripVertical className="h-4 w-4" />
            <span>Drag rows to reorder products</span>
          </div>
        )}

        {/* Products Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive">Failed to load products</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border bg-card">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all"
                          className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
                        />
                      </TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Made By</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No products found
                        </TableCell>
                      </TableRow>
                    ) : (
                      <SortableContext items={productIds} strategy={verticalListSortingStrategy}>
                        {products.map((product) => (
                          <SortableProductRow
                            key={product.id}
                            product={product}
                            isSelected={selectedIds.includes(product.id)}
                            onSelect={handleSelectOne}
                            onPreview={handlePreview}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            isDragDisabled={!!hasActiveFilters}
                          />
                        ))}
                      </SortableContext>
                    )}
                  </TableBody>
                </Table>
              </DndContext>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="ml-4">
                  {totalCount > 0
                    ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} of ${totalCount}`
                    : "0 results"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Dialogs */}
        <AddProductDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
        <EditProductDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          product={selectedProduct}
        />
        <DeleteProductDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          product={selectedProduct}
        />
        <ProductPreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          product={selectedProduct}
        />
        <BulkDeleteProductsDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          productIds={selectedIds}
          onSuccess={handleBulkDeleteSuccess}
        />
        <GoogleSheetsSyncDialog
          open={syncDialogOpen}
          onOpenChange={setSyncDialogOpen}
        />
      </div>
    </AdminLayout>
  );
}
