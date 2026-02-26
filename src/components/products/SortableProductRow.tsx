import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toLocaleDateStringNY } from "@/lib/dateUtils";
import { GripVertical, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Product, useUpdateProduct } from "@/hooks/useProducts";

const platformColors: Record<string, string> = {
  amazon: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  shopify: "bg-green-500/10 text-green-500 border-green-500/20",
  meta: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  other: "bg-muted text-muted-foreground",
};

interface ProductImageData {
  image_url: string;
  niche_id: string | null;
}

interface SortableProductRowProps {
  product: Product;
  productImages: ProductImageData[];
  selectedNicheId: string;
  index: number;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onPreview: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function SortableProductRow({
  product,
  productImages,
  selectedNicheId,
  index,
  isSelected,
  onSelect,
  onPreview,
  onEdit,
  onDelete,
}: SortableProductRowProps) {
  const updateProduct = useUpdateProduct();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Determine cover image based on selected niche
  let coverUrl: string | null = null;
  if (productImages.length > 0) {
    if (selectedNicheId) {
      // Find the first image matching the selected niche (already sorted by display_order)
      const nicheImage = productImages.find(img => img.niche_id === selectedNicheId);
      coverUrl = nicheImage?.image_url || productImages[0].image_url;
    } else {
      // No niche selected or "all" — show first image (cover)
      coverUrl = productImages[0].image_url;
    }
  } else {
    coverUrl = product.image_urls?.[0] || null;
  }
  const imageCount = productImages.length > 0
    ? productImages.length
    : (product.image_urls?.length || 0);

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`${isSelected ? "bg-muted/50" : ""} ${isDragging ? "z-50 shadow-lg" : ""}`}
    >
      <TableCell className="w-10">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(product.id, !!checked)}
          aria-label="Select product"
        />
      </TableCell>
      <TableCell className="w-10">
        <span className="text-sm font-medium text-muted-foreground">{index}</span>
      </TableCell>
      <TableCell>
        <div
          className="h-10 w-10 overflow-hidden rounded-lg bg-muted cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          onClick={() => onPreview(product)}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Product"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              IMG
            </div>
          )}
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
          {imageCount} {imageCount === 1 ? "image" : "images"}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm">
          {product.made_by || "—"}
        </span>
      </TableCell>
      <TableCell>
        <Switch
          checked={(product as any).is_admin ?? false}
          onCheckedChange={(checked) => {
            updateProduct.mutate({ id: product.id, updates: { is_admin: checked } as any });
          }}
        />
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground text-sm">
          {toLocaleDateStringNY(product.created_at)}
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
            <DropdownMenuItem onClick={() => onPreview(product)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(product)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(product)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
