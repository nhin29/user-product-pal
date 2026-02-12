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
import { Loader2, RefreshCw, FileSpreadsheet, Check, Database } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useCategories, useProductTypes } from "@/hooks/useProducts";
import { useQueryClient } from "@tanstack/react-query";

export interface SheetProduct {
  category: string | null;
  image_url: string | null;
  prompt: string | null;
  platform: string;
  product_type: string | null;
  made_by: string | null;
  note: string | null;
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
  category: { label: "Image Style", required: true },
  image_url: { label: "Image URL", required: true },
  prompt: { label: "Prompt", required: true },
  platform: { label: "Platform", required: true },
  product_type: { label: "Product Type", required: false },
  made_by: { label: "Made By", required: false },
  note: { label: "Note", required: false },
};

export function GoogleSheetsSyncDialog({ open, onOpenChange, onProductsFetched }: GoogleSheetsSyncDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const { data: productTypes } = useProductTypes();

  const [sheetUrl, setSheetUrl] = useState("");
  const [availableSheets, setAvailableSheets] = useState<{ title: string; index: number }[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [columns, setColumns] = useState<SheetColumn[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    category: "",
    image_url: "",
    prompt: "",
    platform: "",
    product_type: "",
    made_by: "",
    note: "",
  });

  const [isFetchingSheets, setIsFetchingSheets] = useState(false);
  const [isFetchingHeaders, setIsFetchingHeaders] = useState(false);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [isAddingToDatabase, setIsAddingToDatabase] = useState(false);
  const [fetchedProducts, setFetchedProducts] = useState<SheetProduct[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Fetch available sheets when URL changes
  useEffect(() => {
    const sheetId = parseSheetIdFromUrl(sheetUrl);
    if (sheetId) {
      const timeoutId = setTimeout(() => {
        fetchSheets(sheetId);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setAvailableSheets([]);
      setSheetName("");
    }
  }, [sheetUrl]);

  // Fetch headers when sheet name or header row changes
  useEffect(() => {
    const sheetId = parseSheetIdFromUrl(sheetUrl);
    if (sheetId && sheetName) {
      const timeoutId = setTimeout(() => {
        fetchHeaders(sheetId);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [sheetName, headerRow]);

  const fetchSheets = async (sheetId: string) => {
    setIsFetchingSheets(true);
    setAvailableSheets([]);
    setSheetName("");
    setColumns([]);
    setFetchedProducts([]);

    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
        body: { sheetId, mode: "sheets" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const sheets = data.sheets || [];
      setAvailableSheets(sheets);

      // Auto-select first sheet
      if (sheets.length > 0) {
        setSheetName(sheets[0].title);
      }

      toast({
        title: "Spreadsheet loaded",
        description: `Found ${sheets.length} tab${sheets.length !== 1 ? "s" : ""}`,
      });
    } catch (error: any) {
      console.error("Fetch sheets error:", error);
      toast({
        variant: "destructive",
        title: "Failed to load spreadsheet",
        description: error.message || "Could not fetch sheet tabs",
      });
    } finally {
      setIsFetchingSheets(false);
    }
  };

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

       if (Array.isArray((data as any)?.warnings) && (data as any).warnings.length > 0) {
         toast({
           variant: "destructive",
           title: "Sheet warning",
           description: (data as any).warnings[0],
         });
       }
    } catch (error: any) {
      console.error("Fetch headers error:", error);
      
      // Parse user-friendly error messages from the edge function
      let title = "Failed to load columns";
      let description = error.message || "Could not fetch sheet headers";
      
      // Check for specific error types
      if (description.includes("SHEET_NOT_FOUND:")) {
        title = "Tab not found";
        description = description.replace("SHEET_NOT_FOUND:", "");
      } else if (description.includes("non-2xx status code")) {
        description = "Could not connect to Google Sheets. Please check your URL and tab name.";
      }
      
      toast({
        variant: "destructive",
        title,
        description,
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
      // Select all products by default
      setSelectedIndices(new Set(products.map((_: SheetProduct, i: number) => i)));
      onProductsFetched?.(products);
      
      toast({
        title: "Products fetched",
        description: `Found ${products.length} products`,
      });

       if (Array.isArray((data as any)?.warnings) && (data as any).warnings.length > 0) {
         toast({
           variant: "destructive",
           title: "Image import warning",
           description: (data as any).warnings[0],
         });
       }
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

  // Helper function to normalize strings for matching
  const normalizeString = (str: string | null | undefined): string => {
    return (str || "").toLowerCase().trim().replace(/\s+/g, " ");
  };

  // Helper function to find best matching category
  const findCategoryId = (categoryName: string | null): string | null => {
    if (!categoryName || !categories) return null;
    const normalized = normalizeString(categoryName);
    
    // Exact match first
    const exact = categories.find(c => normalizeString(c.name) === normalized);
    if (exact) return exact.id;
    
    // Partial match (category name contains or is contained in the input)
    const partial = categories.find(c => 
      normalizeString(c.name).includes(normalized) || 
      normalized.includes(normalizeString(c.name))
    );
    if (partial) return partial.id;
    
    return null;
  };

  // Helper function to find best matching product type (niche)
  const findProductTypeId = (typeName: string | null): string | null => {
    if (!typeName || !productTypes) return null;
    const normalized = normalizeString(typeName);
    
    // Exact match first
    const exact = productTypes.find(pt => normalizeString(pt.name) === normalized);
    if (exact) return exact.id;
    
    // Partial match
    const partial = productTypes.find(pt => 
      normalizeString(pt.name).includes(normalized) || 
      normalized.includes(normalizeString(pt.name))
    );
    if (partial) return partial.id;
    
    return null;
  };

  const handleAddToDatabase = async () => {
    if (selectedIndices.size === 0) {
      toast({
        variant: "destructive",
        title: "No products selected",
        description: "Please select at least one product to add",
      });
      return;
    }

    const selectedProducts = fetchedProducts.filter((_, idx) => selectedIndices.has(idx));

    setIsAddingToDatabase(true);

    try {
      // Get the maximum display_order
      const { data: maxOrderData } = await supabase
        .from("products")
        .select("display_order")
        .order("display_order", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      let nextOrder = (maxOrderData?.display_order ?? 0) + 1;

      // Track unmatched categories for error reporting
      const unmatchedCategories: string[] = [];

      // Prepare products for insertion (use selectedProducts instead of fetchedProducts)
      const productsToInsert = selectedProducts
        .filter(p => p.image_url && p.prompt && p.category)
        .map(product => {
          const categoryId = findCategoryId(product.category);
          const productTypeId = findProductTypeId(product.product_type);

          if (!categoryId) {
            console.warn(`Category not found: ${product.category}`);
            if (product.category && !unmatchedCategories.includes(product.category)) {
              unmatchedCategories.push(product.category);
            }
            return null;
          }

          return {
            image_url: product.image_url!,
            prompt: product.prompt!,
            category_id: categoryId,
            product_type_id: productTypeId,
            platform: (product.platform || "amazon").toLowerCase().trim(),
            made_by: product.made_by?.trim() || null,
            note: product.note?.trim() || null,
            display_order: nextOrder++,
          };
        })
        .filter(Boolean);

      if (productsToInsert.length === 0) {
        const categoryList = categories?.map(c => c.name).join(", ") || "none";
        toast({
          variant: "destructive",
          title: "No valid products",
          description: `Categories not found: ${unmatchedCategories.join(", ")}. Available: ${categoryList}`,
        });
        setIsAddingToDatabase(false);
        return;
      }

      const { error } = await supabase
        .from("products")
        .insert(productsToInsert as any[]);

      if (error) throw error;

      // Invalidate products query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["products"] });

      toast({
        title: "Products added",
        description: `Successfully added ${productsToInsert.length} products to the database`,
      });

      // Clear fetched products after successful insert
      setFetchedProducts([]);
      setSelectedIndices(new Set());

    } catch (error: any) {
      console.error("Add to database error:", error);
      toast({
        variant: "destructive",
        title: "Failed to add products",
        description: error.message || "Could not add products to the database",
      });
    } finally {
      setIsAddingToDatabase(false);
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
          
          {/* Tab Selection & Header Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tab Name</Label>
              <div className="flex gap-2 items-center">
                <Select
                  value={sheetName}
                  onValueChange={setSheetName}
                  disabled={availableSheets.length === 0 || isFetchingSheets}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={isFetchingSheets ? "Loading tabs..." : "Select a tab"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSheets.map((sheet) => (
                      <SelectItem key={sheet.index} value={sheet.title}>
                        {sheet.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isFetchingSheets && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
                )}
              </div>
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

          {/* Preview - Fetched Products */}
          {fetchedProducts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all"
                    checked={selectedIndices.size === fetchedProducts.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIndices(new Set(fetchedProducts.map((_, i) => i)));
                      } else {
                        setSelectedIndices(new Set());
                      }
                    }}
                  />
                  <Label htmlFor="select-all" className="flex items-center gap-2 cursor-pointer">
                    <Check className="h-4 w-4 text-primary" />
                    Select All
                  </Label>
                </div>
                <Badge variant="secondary">
                  {selectedIndices.size} / {fetchedProducts.length} selected
                </Badge>
              </div>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                <div className="space-y-2">
                  {fetchedProducts.map((product, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedIndices.has(idx) ? "bg-primary/5 border-primary/30" : "bg-muted/50"
                      }`}
                      onClick={() => {
                        setSelectedIndices(prev => {
                          const next = new Set(prev);
                          if (next.has(idx)) {
                            next.delete(idx);
                          } else {
                            next.add(idx);
                          }
                          return next;
                        });
                      }}
                    >
                      <Checkbox
                        checked={selectedIndices.has(idx)}
                        onCheckedChange={(checked) => {
                          setSelectedIndices(prev => {
                            const next = new Set(prev);
                            if (checked) {
                              next.add(idx);
                            } else {
                              next.delete(idx);
                            }
                            return next;
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt="Product"
                          loading="lazy"
                          decoding="async"
                          className="h-12 w-12 rounded object-cover flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-muted-foreground">No img</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap gap-1 text-xs">
                          {product.category && (
                            <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{product.platform}</Badge>
                          {product.product_type && (
                            <Badge variant="outline" className="text-xs">{product.product_type}</Badge>
                          )}
                        </div>
                        {product.prompt && (
                          <p className="text-xs text-muted-foreground truncate">
                            Prompt: {product.prompt.substring(0, 60)}...
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Add to Database Button */}
          {fetchedProducts.length > 0 && (
            <Button
              onClick={handleAddToDatabase}
              disabled={isAddingToDatabase || selectedIndices.size === 0}
              className="w-full"
            >
              {isAddingToDatabase ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              {selectedIndices.size === 0 
                ? "Select products to add" 
                : `Add ${selectedIndices.size} Selected Products to Database`
              }
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
