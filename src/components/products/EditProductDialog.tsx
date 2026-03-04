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
import { useProductImages, useSyncProductImages, type ProductImageInput } from "@/hooks/useProductImages";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Link, X, ImageIcon, Plus, GripVertical } from "lucide-react";

interface ImageWithNiche {
  url: string;
  file?: File;
  preview?: string;
  niche_id: string | null;
}

function SortableImageCard({
  id,
  img,
  index,
  onRemove,
  onNicheChange,
  productTypes,
  hideNiche,
}: {
  id: string;
  img: ImageWithNiche;
  index: number;
  onRemove: (index: number) => void;
  onNicheChange: (index: number, nicheId: string | null) => void;
  productTypes: { id: string; name: string }[] | undefined;
  hideNiche?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center h-8 w-6 cursor-grab active:cursor-grabbing flex-shrink-0"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <img
        src={img.preview || img.url}
        alt={`Image ${index + 1}`}
        loading="lazy"
        decoding="async"
        className="h-14 w-14 rounded-md object-cover border flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div className="flex-1 min-w-0">
        {index === 0 && (
          <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium mb-1 inline-block">Cover</span>
        )}
        {!hideNiche && (
          <Select
            value={img.niche_id || "none"}
            onValueChange={(v) => onNicheChange(index, v === "none" ? null : v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select niche" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No niche</SelectItem>
              {productTypes?.map((type) => (
                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 text-destructive hover:text-destructive"
        onClick={() => onRemove(index)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

const productSchema = z.object({
  category_id: z.string().optional(),
  description: z.string().max(1000, "Description too long").optional(),
  prompt: z.string().min(1, "Prompt is required"),
  platform: z.enum(["amazon", "shopify", "meta", "woo", "video", "other"]),
  made_by: z.string().max(200, "Made by is too long").optional(),
  note: z.string().max(1000, "Note is too long").optional(),
}).refine((data) => {
  if (data.platform !== "video" && (!data.category_id || data.category_id.length === 0)) {
    return false;
  }
  return true;
}, { message: "Category is required", path: ["category_id"] });

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
  const { data: existingProductImages } = useProductImages(product?.id);
  const syncProductImages = useSyncProductImages();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageTab, setImageTab] = useState<"upload" | "url">("url");
  const [images, setImages] = useState<ImageWithNiche[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const imageIds = useMemo(
    () => images.map((img, i) => `img-${i}-${(img.url || img.preview || "").slice(-20)}`),
    [images]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = imageIds.indexOf(active.id as string);
      const newIndex = imageIds.indexOf(over.id as string);
      setImages((prev) => arrayMove(prev, oldIndex, newIndex));
    }
  };

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      category_id: "",
      description: "",
      prompt: "",
      platform: "amazon",
      made_by: "",
      note: "",
    },
  });

  // Initialize form when product changes
  useEffect(() => {
    if (product) {
      form.reset({
        category_id: product.category_id || "",
        description: product.description || "",
        prompt: product.prompt,
        platform: product.platform as "amazon" | "shopify" | "meta" | "woo" | "video" | "other",
        made_by: product.made_by || "",
        note: product.note || "",
      });
      setInitialized(false);
    }
  }, [product, form]);

  // Load images from product_images table
  useEffect(() => {
    if (product && existingProductImages && !initialized) {
      if (existingProductImages.length > 0) {
        setImages(existingProductImages.map(img => ({
          url: img.image_url,
          niche_id: img.niche_id,
        })));
      } else {
        // Fallback to image_urls if no product_images exist
        setImages((product.image_urls || []).map(url => ({
          url,
          niche_id: product.product_type_id || null,
        })));
      }
      setInitialized(true);
    }
  }, [product, existingProductImages, initialized]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const prefix = form.getValues("platform") === "video" ? "video/" : "image/";
    const imageFiles = files.filter(f => f.type.startsWith(prefix));
    const newImages: ImageWithNiche[] = imageFiles.map(f => ({
      url: "",
      file: f,
      preview: URL.createObjectURL(f),
      niche_id: null,
    }));
    setImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const img = prev[index];
      if (img.preview) URL.revokeObjectURL(img.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateImageNiche = (index: number, nicheId: string | null) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, niche_id: nicheId } : img));
  };

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed && (trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
      setImages(prev => [...prev, { url: trimmed, niche_id: null }]);
      setUrlInput("");
    } else if (trimmed) {
      toast({ variant: "destructive", title: "Invalid URL", description: "Please enter a valid URL" });
    }
  };

  const clearUploads = () => {
    images.forEach(img => { if (img.preview) URL.revokeObjectURL(img.preview); });
    setImages([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!product) return;
    
    if (images.length === 0) {
      toast({ variant: "destructive", title: "Image required", description: "Please add at least one image" });
      return;
    }

    try {
      setIsUploading(true);

      // Upload new files and resolve URLs
      const resolvedImages: ProductImageInput[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        let url = img.url;
        if (img.file) {
          url = await uploadImage(img.file);
        }
        resolvedImages.push({ image_url: url, niche_id: img.niche_id, display_order: i });
      }

      const isVideo = data.platform === "video";
      await updateProduct.mutateAsync({
        id: product.id,
        updates: {
          category_id: isVideo ? "" : (data.category_id || ""),
          image_urls: resolvedImages.map(i => i.image_url),
          prompt: data.prompt,
          platform: data.platform,
          description: data.description || null,
          made_by: data.made_by || null,
          note: data.note || null,
        },
      });

      // Sync to product_images table
      await syncProductImages.mutateAsync({
        productId: product.id,
        images: resolvedImages,
      });

      toast({ title: "Product updated", description: "The product has been updated successfully." });
      clearUploads();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update product" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      clearUploads();
      setImageTab("url");
      setInitialized(false);
    }
    onOpenChange(open);
  };

  const isPending = updateProduct.isPending || isUploading;

  const isVideoPlatform = form.watch("platform") === "video";

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Update the product details below.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select onValueChange={(v) => {
                      field.onChange(v);
                      if (v === "video") {
                        form.setValue("category_id", "");
                      }
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="amazon">Amazon</SelectItem>
                        <SelectItem value="shopify">Shopify</SelectItem>
                        <SelectItem value="meta">Meta</SelectItem>
                        <SelectItem value="woo">WooCommerce</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isVideoPlatform && (
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
                            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Image list with per-image niche and drag-and-drop */}
            <div className="space-y-2">
              <FormLabel>Product {isVideoPlatform ? "Videos" : "Images"}</FormLabel>
              {!isVideoPlatform && (
                <p className="text-xs text-muted-foreground">Drag to reorder. First image is the cover. Each image can have its own niche.</p>
              )}
              
              {images.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={imageIds} strategy={rectSortingStrategy}>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {images.map((img, index) => (
                        <SortableImageCard
                          key={imageIds[index]}
                          id={imageIds[index]}
                          img={img}
                          index={index}
                          onRemove={removeImage}
                          onNicheChange={updateImageNiche}
                          productTypes={productTypes}
                          hideNiche={isVideoPlatform}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              <Tabs value={imageTab} onValueChange={(v) => setImageTab(v as "upload" | "url")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" /> Upload New
                  </TabsTrigger>
                  <TabsTrigger value="url" className="gap-2">
                    <Link className="h-4 w-4" /> Add URL
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-3">
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">Click to upload {isVideoPlatform ? "videos" : "images"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{isVideoPlatform ? "MP4, MOV, WEBM" : "PNG, JPG, WEBP"} — select multiple</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={isVideoPlatform ? "video/*" : "image/*"}
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
                    <Textarea placeholder="Describe the product image prompt..." className="min-h-[80px]" {...field} />
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
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
