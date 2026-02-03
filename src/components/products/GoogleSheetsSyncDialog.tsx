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
import { Loader2, RefreshCw, FileSpreadsheet } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export interface SheetProduct {
  title: string;
  category: string;
  description?: string;
  image_url: string;
  prompt: string;
  platform: string;
  product_type?: string;
}

interface GoogleSheetsSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductsFetched?: (products: SheetProduct[]) => void;
}

// Parse Sheet ID from various Google Sheets URL formats
function parseSheetIdFromUrl(url: string): string | null {
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /^([a-zA-Z0-9-_]+)$/, // Direct ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function GoogleSheetsSyncDialog({ open, onOpenChange, onProductsFetched }: GoogleSheetsSyncDialogProps) {
  const { toast } = useToast();

  const [sheetUrl, setSheetUrl] = useState("");
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
  const [fetchedProducts, setFetchedProducts] = useState<SheetProduct[]>([]);

  const handleFetch = async () => {
    if (!sheetUrl.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a Google Sheet URL" });
      return;
    }

    const sheetId = parseSheetIdFromUrl(sheetUrl.trim());
    if (!sheetId) {
      toast({ variant: "destructive", title: "Error", description: "Invalid Google Sheet URL" });
      return;
    }

    setIsFetching(true);
    setFetchedProducts([]);

    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
        body: { sheetId, sheetName: sheetName.trim(), columnMapping },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const products = data.products || [];
      setFetchedProducts(products);
      
      // Pass products to parent
      onProductsFetched?.(products);
      
      toast({
        title: "Fetched successfully",
        description: `Found ${products.length} products from Google Sheets`,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Sync from Google Sheets
          </DialogTitle>
          <DialogDescription>
            Fetch products from your Google Sheet. Make sure the sheet is shared with your service account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sheet URL & Tab Name */}
          <div className="space-y-2">
            <Label htmlFor="sheetUrl">Google Sheet URL</Label>
            <Input
              id="sheetUrl"
              placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
            />
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
              <div className="flex items-center justify-between">
                <Label>Fetched Products</Label>
                <Badge variant="secondary">{fetchedProducts.length} products</Badge>
              </div>
              <ScrollArea className="h-[250px] rounded-md border p-2">
                <div className="space-y-2">
                  {fetchedProducts.map((product, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                    >
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="h-12 w-12 rounded object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.category} • {product.platform}
                        </p>
                        {product.prompt && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {product.prompt}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground text-center">
                Products are displayed in UI only (not saved to database)
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
