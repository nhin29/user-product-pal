import { useState, useRef, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdateProduct, useProductTypes, useCategories, Product } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Link, X, ImageIcon, Plus, GripVertical } from "lucide-react";

function SortableImage({
  id,
  url,
  index,
  onRemove,
}: {
  id: string;
  url: string;
  index: number;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <img
        src={url}
        alt={`Image ${index + 1}`}
        loading="lazy"
        decoding="async"
        className="w-full h-24 object-cover rounded-lg border"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 h-6 w-6 flex items-center justify-center rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(index)}
      >
        <X className="h-3 w-3" />
      </Button>
      {index === 0 && (
        <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium">
          Cover
        </span>
      )}
    </div>
  );
}

const productSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  description: z.string().max(1000, "Description too long").optional(),
  prompt: z.string().min(1, "Prompt is required"),
  platform: z.enum(["amazon", "shopify", "meta", "other"]),
  product_type_id: z.string().optional(),
  made_by: z.string().max(200, "Made by is too long").optional(),
  note: z.string().max(1000, "Note is too long").optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function EditProductDialog({ open, onOpenChange, product }: EditProductDialogProps) {
  const { toast } = useToast();
  const { data: productTypes } = useProductTypes();
  const { data: categories } = useCategories();
  const updateProduct = useUpdateProduct();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageTab, setImageTab] = useState<"upload" | "url">("url");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const imageIds = useMemo(
    () => existingUrls.map((url, i) => `img-${i}-${url.slice(-20)}`),
    [existingUrls]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = imageIds.indexOf(active.id as string);
      const newIndex = imageIds.indexOf(over.id as string);
      setExistingUrls((prev) => arrayMove(prev, oldIndex, newIndex));
    }
  };

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      category_id: "",
      description: "",
      prompt: "",
      platform: "amazon",
      product_type_id: undefined,
      made_by: "",
      note: "",
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        category_id: product.category_id,
        description: product.description || "",
        prompt: product.prompt,
        platform: product.platform as "amazon" | "shopify" | "meta" | "other",
        product_type_id: product.product_type_id || undefined,
        made_by: product.made_by || "",
        note: product.note || "",
      });
      setExistingUrls(product.image_urls || []);
      setImageTab("url");
      setUploadedFiles([]);
      setUploadPreviews([]);
    }
  }, [product, form]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 5 * 1024 * 1024; // 5MB
    const imageFiles = files.filter(f => {
      if (!f.type.startsWith("image/")) return false;
      if (f.size > maxSize) {
        toast({ variant: "destructive", title: "File too large", description: `${f.name} exceeds 5MB limit` });
        return false;
      }
      return true;
    });

    const newPreviews = imageFiles.map(f => URL.createObjectURL(f));
    setUploadedFiles(prev => [...prev, ...imageFiles]);
    setUploadPreviews(prev => [...prev, ...newPreviews]);
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeUploadedFile = (index: number) => {
    URL.revokeObjectURL(uploadPreviews[index]);
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingUrl = (index: number) => {
    setExistingUrls(prev => prev.filter((_, i) => i !== index));
  };

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed && (trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
      setExistingUrls(prev => [...prev, trimmed]);
      setUrlInput("");
    } else if (trimmed) {
      toast({ variant: "destructive", title: "Invalid URL", description: "Please enter a valid URL" });
    }
  };

  const clearUploads = () => {
    uploadPreviews.forEach(p => URL.revokeObjectURL(p));
    setUploadedFiles([]);
    setUploadPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!product) return;
    
    try {
      setIsUploading(true);
      
      // Upload new files
      let newUploadedUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        newUploadedUrls = await Promise.all(uploadedFiles.map(f => uploadImage(f)));
      }

      const finalImageUrls = [...existingUrls, ...newUploadedUrls];

      if (finalImageUrls.length === 0) {
        toast({ variant: "destructive", title: "Image required", description: "Please add at least one image" });
        setIsUploading(false);
        return;
      }

      await updateProduct.mutateAsync({
        id: product.id,
        updates: {
          category_id: data.category_id,
          image_urls: finalImageUrls,
          prompt: data.prompt,
          platform: data.platform,
          product_type_id: data.product_type_id || null,
          description: data.description || null,
          made_by: data.made_by || null,
          note: data.note || null,
        },
      });

      toast({
        title: "Product updated",
        description: "The product has been updated successfully.",
      });
      
      clearUploads();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update product",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      clearUploads();
      setImageTab("url");
    }
    onOpenChange(open);
  };

  const isPending = updateProduct.isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the product details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image Style</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select image style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="amazon">Amazon</SelectItem>
                        <SelectItem value="shopify">Shopify</SelectItem>
                        <SelectItem value="meta">Meta</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="product_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product type (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {productTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Multi Image Section */}
            <div className="space-y-2">
              <FormLabel>Product Images</FormLabel>
              <p className="text-xs text-muted-foreground">Drag to reorder. First image is the cover.</p>
              
              {/* Existing images with drag-and-drop */}
              {existingUrls.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={imageIds} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-3 gap-2">
                      {existingUrls.map((url, index) => (
                        <SortableImage
                          key={imageIds[index]}
                          id={imageIds[index]}
                          url={url}
                          index={index}
                          onRemove={removeExistingUrl}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {/* New uploads preview */}
              {uploadPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {uploadPreviews.map((preview, index) => (
                    <div key={`new-${index}`} className="relative group">
                      <img
                        src={preview}
                        alt={`New ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-24 object-cover rounded-lg border border-primary/30"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeUploadedFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Tabs value={imageTab} onValueChange={(v) => setImageTab(v as "upload" | "url")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload New
                  </TabsTrigger>
                  <TabsTrigger value="url" className="gap-2">
                    <Link className="h-4 w-4" />
                    Add URL
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-3">
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">Click to upload images</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP — select multiple</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </TabsContent>
                <TabsContent value="url" className="mt-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addUrl}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the product image prompt..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="made_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Made By</FormLabel>
                    <FormControl>
                      <Input placeholder="Creator name..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Input placeholder="Additional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
