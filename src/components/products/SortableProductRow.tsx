import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Product } from "@/hooks/useProducts";

const platformColors: Record<string, string> = {
  amazon: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  shopify: "bg-green-500/10 text-green-500 border-green-500/20",
  meta: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  other: "bg-muted text-muted-foreground",
};

interface SortableProductRowProps {
  product: Product;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onPreview: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  isDragDisabled?: boolean;
}

export function SortableProductRow({
  product,
  isSelected,
  onSelect,
  onPreview,
  onEdit,
  onDelete,
  isDragDisabled = false,
}: SortableProductRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`${isSelected ? "bg-muted/50" : ""} ${isDragging ? "z-50 shadow-lg" : ""}`}
    >
      <TableCell className="w-10">
        {!isDragDisabled && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </TableCell>
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(product.id, !!checked)}
          aria-label={`Select ${product.title}`}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 overflow-hidden rounded-lg bg-muted cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => onPreview(product)}
          >
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
            <span
              className="font-medium text-foreground line-clamp-1 cursor-pointer hover:text-primary transition-colors"
              onClick={() => onPreview(product)}
            >
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
