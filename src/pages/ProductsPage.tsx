import { useState } from "react";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const products = [
  {
    id: 1,
    name: "Wireless Headphones",
    category: "Electronics",
    price: "$149.99",
    stock: 234,
    status: "In Stock",
  },
  {
    id: 2,
    name: "Leather Backpack",
    category: "Accessories",
    price: "$89.00",
    stock: 56,
    status: "Low Stock",
  },
  {
    id: 3,
    name: "Smart Watch Pro",
    category: "Electronics",
    price: "$299.99",
    stock: 0,
    status: "Out of Stock",
  },
  {
    id: 4,
    name: "Running Shoes",
    category: "Footwear",
    price: "$129.00",
    stock: 178,
    status: "In Stock",
  },
  {
    id: 5,
    name: "Organic Coffee Beans",
    category: "Food & Beverage",
    price: "$24.99",
    stock: 89,
    status: "In Stock",
  },
  {
    id: 6,
    name: "Yoga Mat Premium",
    category: "Fitness",
    price: "$45.00",
    stock: 12,
    status: "Low Stock",
  },
];

const statusBadge = (status: string) => {
  switch (status) {
    case "In Stock":
      return "badge-success";
    case "Low Stock":
      return "badge-warning";
    case "Out of Stock":
      return "badge-destructive";
    default:
      return "badge-muted";
  }
};

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Products</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your product inventory and catalog.
            </p>
          </div>
          <Button>
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
        <div className="data-table">
          <table className="w-full">
            <thead>
              <tr className="data-table-header">
                <th className="px-6 py-3 text-left">Product</th>
                <th className="px-6 py-3 text-left">Category</th>
                <th className="px-6 py-3 text-left">Price</th>
                <th className="px-6 py-3 text-left">Stock</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="data-table-row">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <span className="text-xs font-medium text-muted-foreground">
                          IMG
                        </span>
                      </div>
                      <span className="font-medium text-foreground">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-muted-foreground">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-foreground">
                      {product.price}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-muted-foreground">
                      {product.stock} units
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={statusBadge(product.status)}>
                      {product.status}
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
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
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
      </div>
    </AdminLayout>
  );
}
