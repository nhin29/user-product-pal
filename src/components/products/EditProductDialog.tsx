import { useState, useRef, useEffect } from "react";
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
import { useUpdateProduct, useProductTypes, useCategories, Product } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Link, X, ImageIcon } from "lucide-react";

const productSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  description: z.string().max(1000, "Description too long").optional(),
  image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      category_id: "",
      description: "",
      image_url: "",
      prompt: "",
      platform: "amazon",
      product_type_id: undefined,
      made_by: "",
      note: "",
    },
  });

  // Update form when product changes
  useEffect(() => {
    if (product) {
      form.reset({
        category_id: product.category_id,
        description: product.description || "",
        image_url: product.image_url,
        prompt: product.prompt,
        platform: product.platform as "amazon" | "shopify" | "meta" | "other",
        product_type_id: product.product_type_id || undefined,
        made_by: product.made_by || "",
        note: product.note || "",
      });
      setImageTab("url");
    }
  }, [product, form]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: "Please select an image file",
        });
        return;
      }
      setUploadedFile(file);
      const preview = URL.createObjectURL(file);
      setUploadPreview(preview);
    }
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    if (uploadPreview) {
      URL.revokeObjectURL(uploadPreview);
      setUploadPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!product) return;
    
    try {
      setIsUploading(true);
      let finalImageUrl = data.image_url || product.image_url;

      // If upload tab is selected and file exists, upload it
      if (imageTab === "upload" && uploadedFile) {
        finalImageUrl = await uploadImage(uploadedFile);
      }

      if (!finalImageUrl) {
        toast({
          variant: "destructive",
          title: "Image required",
          description: "Please upload an image or enter an image URL",
        });
        setIsUploading(false);
        return;
      }

      await updateProduct.mutateAsync({
        id: product.id,
        updates: {
          category_id: data.category_id,
          image_url: finalImageUrl,
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
      
      clearUploadedFile();
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
      clearUploadedFile();
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

            {/* Image Upload/URL Section */}
            <div className="space-y-2">
              <FormLabel>Product Image</FormLabel>
              <Tabs value={imageTab} onValueChange={(v) => setImageTab(v as "upload" | "url")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload New
                  </TabsTrigger>
                  <TabsTrigger value="url" className="gap-2">
                    <Link className="h-4 w-4" />
                    URL
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-3">
                  <div className="space-y-3">
                    {uploadPreview ? (
                      <div className="relative">
                        <img
                          src={uploadPreview}
                          alt="Preview"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-40 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7"
                          onClick={clearUploadedFile}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload new image
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, WEBP (no size limit)
                        </p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="url" className="mt-3">
                  <FormField
                    control={form.control}
                    name="image_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="Current"
                              loading="lazy"
                              decoding="async"
                              className="w-full h-32 object-cover rounded-lg border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
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
