import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, FileSpreadsheet, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export interface SheetProduct {
  title: string | null;
  category: string | null;
  image_url: string | null;
  prompt: string | null;
  platform: string;
  product_type: string | null;
}

interface SheetColumn {
  name: string;
  index: number;
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

const FIELD_LABELS: Record<string, { label: string; required: boolean }> = {
  title: { label: "Title", required: true },
  category: { label: "Category", required: true },
  image_url: { label: "Image URL", required: true },
  prompt: { label: "Prompt", required: true },
  platform: { label: "Platform", required: true },
  product_type: { label: "Product Type", required: false },
};

export function GoogleSheetsSyncDialog({ open, onOpenChange, onProductsFetched }: GoogleSheetsSyncDialogProps) {
  const { toast } = useToast();

  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [headerRow, setHeaderRow] = useState(1);
  const [columns, setColumns] = useState<SheetColumn[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    title: "",
    category: "",
    image_url: "",
    prompt: "",
    platform: "",
    product_type: "",
  });

  const [isFetchingHeaders, setIsFetchingHeaders] = useState(false);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [fetchedProducts, setFetchedProducts] = useState<SheetProduct[]>([]);

  // Fetch headers when URL or header row changes
  useEffect(() => {
    const sheetId = parseSheetIdFromUrl(sheetUrl);
    if (sheetId && sheetName) {
      const timeoutId = setTimeout(() => {
        fetchHeaders(sheetId);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [sheetUrl, sheetName, headerRow]);

  const fetchHeaders = async (sheetId: string) => {
    setIsFetchingHeaders(true);
    setColumns([]);
    setFetchedProducts([]);

    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
        body: { sheetId, sheetName: sheetName.trim(), headerRow, mode: "headers" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const headers = data.headers || [];
      setColumns(headers);

      // Try to auto-map columns by matching names
      const newMapping: Record<string, string> = {};
      Object.keys(FIELD_LABELS).forEach((field) => {
        const matchingCol = headers.find((col: SheetColumn) =>
          col.name.toLowerCase().includes(field.replace("_", " ").toLowerCase()) ||
          col.name.toLowerCase().includes(field.replace("_", "").toLowerCase())
        );
        newMapping[field] = matchingCol ? String(matchingCol.index) : "";
      });
      setColumnMapping(newMapping);

      toast({
        title: "Columns loaded",
        description: `Found ${headers.length} columns in the sheet`,
      });
    } catch (error: any) {
      console.error("Fetch headers error:", error);
      toast({
        variant: "destructive",
        title: "Failed to load columns",
        description: error.message || "Could not fetch sheet headers",
      });
    } finally {
      setIsFetchingHeaders(false);
    }
  };

  const handleFetchProducts = async () => {
    const sheetId = parseSheetIdFromUrl(sheetUrl.trim());
    if (!sheetId) {
      toast({ variant: "destructive", title: "Error", description: "Invalid Google Sheet URL" });
      return;
    }

    // Validate required fields
    const requiredFields = Object.entries(FIELD_LABELS)
      .filter(([, config]) => config.required)
      .map(([key]) => key);

    const missingFields = requiredFields.filter((field) => !columnMapping[field]);
    if (missingFields.length > 0) {
      toast({
        variant: "destructive",
        title: "Missing mappings",
        description: `Please map: ${missingFields.map((f) => FIELD_LABELS[f].label).join(", ")}`,
      });
      return;
    }

    setIsFetchingProducts(true);
    setFetchedProducts([]);

    try {
      // Convert index strings to numbers for the API
      const mappingForApi = Object.fromEntries(
        Object.entries(columnMapping)
          .filter(([, value]) => value !== "")
          .map(([key, value]) => [key, parseInt(value, 10)])
      );

      const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
        body: { sheetId, sheetName: sheetName.trim(), headerRow, mode: "data", columnMapping: mappingForApi },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const products = data.products || [];
      setFetchedProducts(products);
      onProductsFetched?.(products);
      
      toast({
        title: "Products fetched",
        description: `Found ${products.length} products`,
      });
    } catch (error: any) {
      console.error("Fetch products error:", error);
      toast({
        variant: "destructive",
        title: "Fetch failed",
        description: error.message || "Failed to fetch products",
      });
    } finally {
      setIsFetchingProducts(false);
    }
  };

  const handleMappingChange = (field: string, value: string) => {
    setColumnMapping((prev) => ({ ...prev, [field]: value }));
  };

  const hasRequiredMappings = Object.entries(FIELD_LABELS)
    .filter(([, config]) => config.required)
    .every(([key]) => columnMapping[key] !== "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Sync from Google Sheets
          </DialogTitle>
          <DialogDescription>
            Paste your Google Sheet URL to load columns automatically, then map them to product fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sheet URL */}
          <div className="space-y-2">
            <Label htmlFor="sheetUrl">Google Sheet URL</Label>
            <Input
              id="sheetUrl"
              placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
            />
          </div>
          
          {/* Tab Name & Header Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sheetName">Tab Name</Label>
              <Input
                id="sheetName"
                placeholder="Sheet1"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="headerRow">Header Row</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="headerRow"
                  type="number"
                  min={1}
                  max={100}
                  value={headerRow}
                  onChange={(e) => setHeaderRow(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground flex-1">
                  Row with column names
                </span>
                {isFetchingHeaders && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          {/* Column Mapping */}
          {columns.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Column Mapping</Label>
                <Badge variant="outline" className="text-xs">
                  {columns.length} columns found
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(FIELD_LABELS).map(([field, config]) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">
                      {config.label}
                      {config.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Select
                      value={columnMapping[field] || "none"}
                      onValueChange={(value) => handleMappingChange(field, value === "none" ? "" : value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Not mapped --</SelectItem>
                        {columns.map((col) => (
                          <SelectItem key={col.index} value={String(col.index)}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fetch Button */}
          {columns.length > 0 && (
            <Button
              onClick={handleFetchProducts}
              disabled={isFetchingProducts || !hasRequiredMappings}
              className="w-full"
            >
              {isFetchingProducts ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Fetch Products
            </Button>
          )}

          {/* Preview */}
          {fetchedProducts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Fetched Products
                </Label>
                <Badge variant="secondary">{fetchedProducts.length} products</Badge>
              </div>
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
