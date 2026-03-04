import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useCreateProduct, useProductTypes, useCategories } from "@/hooks/useProducts";
import { useSyncProductImages, type ProductImageInput } from "@/hooks/useProductImages";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Link, X, ImageIcon, Plus, Video } from "lucide-react";

interface ImageWithNiche {
  url: string;
  file?: File;
  preview?: string;
  niche_id: string | null;
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

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
  const { toast } = useToast();
  const { data: productTypes } = useProductTypes();
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const syncProductImages = useSyncProductImages();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageTab, setImageTab] = useState<"upload" | "url">("upload");
  const [images, setImages] = useState<ImageWithNiche[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);

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

  const selectedPlatform = form.watch("platform");
  const isVideoPlatform = selectedPlatform === "video";
  const mediaLabel = isVideoPlatform ? "Videos" : "Images";
  const acceptType = isVideoPlatform ? "video/*" : "image/*";


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const prefix = isVideoPlatform ? "video/" : "image/";
    const validFiles = files.filter(f => f.type.startsWith(prefix));
    const newImages: ImageWithNiche[] = validFiles.map(f => ({
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

  const clearAll = () => {
    images.forEach(img => { if (img.preview) URL.revokeObjectURL(img.preview); });
    setImages([]);
    setUrlInput("");
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
    if (images.length === 0) {
      toast({ variant: "destructive", title: `${isVideoPlatform ? "Video" : "Image"} required`, description: `Please add at least one ${isVideoPlatform ? "video" : "image"}` });
      return;
    }

    // For video platform, clear category_id
    const categoryId = isVideoPlatform ? undefined : data.category_id;

    try {
      setIsUploading(true);

      // Upload files and resolve URLs
      const resolvedImages: ProductImageInput[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        let url = img.url;
        if (img.file) {
          url = await uploadImage(img.file);
        }
        resolvedImages.push({ image_url: url, niche_id: img.niche_id, display_order: i });
      }

      const product = await createProduct.mutateAsync({
        category_id: categoryId || null,
        image_urls: resolvedImages.map(i => i.image_url),
        prompt: data.prompt,
        platform: data.platform,
        description: data.description || null,
        made_by: data.made_by || null,
        note: data.note || null,
      });

      // Sync to product_images table (skip niche for video platform)
      const imagesToSync = isVideoPlatform
        ? resolvedImages.map(img => ({ ...img, niche_id: null }))
        : resolvedImages;
      await syncProductImages.mutateAsync({
        productId: product.id,
        images: imagesToSync,
      });

      toast({ title: "Product created", description: "The product has been added successfully." });
      form.reset();
      clearAll();
      setImageTab("upload");
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to create product" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      form.reset();
      clearAll();
      setImageTab("upload");
    }
    onOpenChange(open);
  };

  const isPending = createProduct.isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>Fill in the details below to create a new product.</DialogDescription>
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
                    }} defaultValue={field.value}>
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

            {/* Multi Image Upload/URL Section with per-image niche */}
            <div className="space-y-2">
              <FormLabel>Product {mediaLabel}</FormLabel>
              
              {/* Image list with niche selectors */}
              {images.length > 0 && (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {images.map((img, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                      {isVideoPlatform ? (
                        <video
                          src={img.preview || img.url}
                          className="h-14 w-14 rounded-md object-cover border flex-shrink-0"
                          muted
                        />
                      ) : (
                        <img
                          src={img.preview || img.url}
                          alt={`Image ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="h-14 w-14 rounded-md object-cover border flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {img.file?.name || img.url}
                        </p>
                        {!isVideoPlatform && (
                          <Select
                            value={img.niche_id || "none"}
                            onValueChange={(v) => updateImageNiche(index, v === "none" ? null : v)}
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
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Tabs value={imageTab} onValueChange={(v) => setImageTab(v as "upload" | "url")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" /> Upload
                  </TabsTrigger>
                  <TabsTrigger value="url" className="gap-2">
                    <Link className="h-4 w-4" /> URLs
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-3">
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isVideoPlatform ? (
                      <Video className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                    ) : (
                      <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                    )}
                    <p className="text-sm text-muted-foreground">Click to upload {isVideoPlatform ? "videos" : "images"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{isVideoPlatform ? "MP4, MOV, WEBM" : "PNG, JPG, WEBP"} — select multiple files</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptType}
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
                Add Product
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
