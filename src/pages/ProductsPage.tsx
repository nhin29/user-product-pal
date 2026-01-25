import { useState } from "react";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye, Loader2 } from "lucide-react";
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
import { useProducts, useDeleteProduct } from "@/hooks/useProducts";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import { useToast } from "@/hooks/use-toast";

const platformColors: Record<string, string> = {
  amazon: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  shopify: "bg-green-500/10 text-green-500 border-green-500/20",
  meta: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  other: "bg-muted text-muted-foreground",
};

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { data: products, isLoading, error } = useProducts();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();

  const filteredProducts = products?.filter(
    (product) => {
      const categoryName = (product as any).categories?.name || "";
      return (
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.platform.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  );

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteProduct.mutateAsync(id);
        toast({
          title: "Product deleted",
          description: "The product has been removed.",
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to delete product",
        });
      }
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
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

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
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts?.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-lg bg-muted">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                IMG
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground line-clamp-1">
                              {product.title}
                            </span>
                            {product.description && (
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {product.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {(product as any).categories?.name || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={platformColors[product.platform] || platformColors.other}
                        >
                          {product.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {(product as any).product_types?.name || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {new Date(product.created_at).toLocaleDateString()}
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
                            <DropdownMenuItem
                              onClick={() => window.open(product.image_url, "_blank")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Image
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(product.id, product.title)}
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

        <AddProductDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      </div>
    </AdminLayout>
  );
}
