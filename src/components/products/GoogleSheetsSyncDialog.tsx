import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCreateProduct, useCategories, useProductTypes } from "@/hooks/useProducts";
import { Loader2, RefreshCw, FileSpreadsheet } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GoogleSheetsSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SheetProduct {
  title: string;
  category: string;
  description?: string;
  image_url: string;
  prompt: string;
  platform: string;
  product_type?: string;
}

export function GoogleSheetsSyncDialog({ open, onOpenChange }: GoogleSheetsSyncDialogProps) {
  const { toast } = useToast();
  const { data: categories } = useCategories();
  const { data: productTypes } = useProductTypes();
  const createProduct = useCreateProduct();

  const [sheetId, setSheetId] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [columnMapping, setColumnMapping] = useState({
    title: "A",
    category: "B",
    description: "C",
    image_url: "D",
    prompt: "E",
    platform: "F",
    product_type: "G",
  });

  const [isFetching, setIsFetching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fetchedProducts, setFetchedProducts] = useState<SheetProduct[]>([]);

  const handleFetch = async () => {
    if (!sheetId.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a Sheet ID" });
      return;
    }

    setIsFetching(true);
    setFetchedProducts([]);

    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
        body: { sheetId: sheetId.trim(), sheetName: sheetName.trim(), columnMapping },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setFetchedProducts(data.products || []);
      toast({
        title: "Fetched successfully",
        description: `Found ${data.products?.length || 0} products from Google Sheets`,
      });
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast({
        variant: "destructive",
        title: "Fetch failed",
        description: error.message || "Failed to fetch from Google Sheets",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleImport = async () => {
    if (fetchedProducts.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "No products to import" });
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const product of fetchedProducts) {
        // Find category by name
        const category = categories?.find(
          (c) => c.name.toLowerCase() === product.category.toLowerCase()
        );
        if (!category) {
          console.warn(`Category not found: ${product.category}`);
          errorCount++;
          continue;
        }

        // Find product type by name (optional)
        const productType = productTypes?.find(
          (t) => t.name.toLowerCase() === product.product_type?.toLowerCase()
        );

        // Validate platform
        const validPlatforms = ["amazon", "shopify", "meta", "other"];
        const platform = validPlatforms.includes(product.platform.toLowerCase())
          ? product.platform.toLowerCase()
          : "other";

        try {
          await createProduct.mutateAsync({
            title: product.title,
            category_id: category.id,
            description: product.description || null,
            image_url: product.image_url,
            prompt: product.prompt,
            platform: platform as "amazon" | "shopify" | "meta" | "other",
            product_type_id: productType?.id || null,
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to create product: ${product.title}`, err);
          errorCount++;
        }
      }

      toast({
        title: "Import complete",
        description: `Successfully imported ${successCount} products. ${errorCount > 0 ? `${errorCount} failed.` : ""}`,
      });

      if (successCount > 0) {
        setFetchedProducts([]);
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error.message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Sync from Google Sheets
          </DialogTitle>
          <DialogDescription>
            Import products from your Google Sheet. Make sure the sheet is shared with your service account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sheet ID & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sheetId">Sheet ID</Label>
              <Input
                id="sheetId"
                placeholder="1BxiMVs0XRA5..."
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                From URL: /spreadsheets/d/<strong>SHEET_ID</strong>/edit
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheetName">Tab Name</Label>
              <Input
                id="sheetName"
                placeholder="Sheet1"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
              />
            </div>
          </div>

          {/* Column Mapping */}
          <div className="space-y-2">
            <Label>Column Mapping</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(columnMapping).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs capitalize">{key.replace("_", " ")}</Label>
                  <Input
                    className="h-8 text-center uppercase"
                    maxLength={2}
                    value={value}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({ ...prev, [key]: e.target.value.toUpperCase() }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Fetch Button */}
          <Button onClick={handleFetch} disabled={isFetching} className="w-full">
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Fetch Products
          </Button>

          {/* Preview */}
          {fetchedProducts.length > 0 && (
            <div className="space-y-2">
              <Label>Preview ({fetchedProducts.length} products)</Label>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                <div className="space-y-2">
                  {fetchedProducts.map((product, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                    >
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="h-10 w-10 rounded object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.category} • {product.platform}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button
                onClick={handleImport}
                disabled={isImporting}
                variant="default"
                className="w-full"
              >
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Import {fetchedProducts.length} Products
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
