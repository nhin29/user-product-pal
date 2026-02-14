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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Link, X, ImageIcon, Plus } from "lucide-react";

const productSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  description: z.string().max(1000, "Description too long").optional(),
  image_urls_input: z.string().optional(),
  prompt: z.string().min(1, "Prompt is required"),
  platform: z.enum(["amazon", "shopify", "meta", "other"]),
  product_type_id: z.string().optional(),
  made_by: z.string().max(200, "Made by is too long").optional(),
  note: z.string().max(1000, "Note is too long").optional(),
});

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageTab, setImageTab] = useState<"upload" | "url">("upload");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [urlList, setUrlList] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      category_id: "",
      description: "",
      image_urls_input: "",
      prompt: "",
      platform: "amazon",
      product_type_id: undefined,
      made_by: "",
      note: "",
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    
    if (imageFiles.length !== files.length) {
      toast({
        variant: "destructive",
        title: "Invalid files",
        description: "Some files were not images and were skipped",
      });
    }

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

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed && (trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
      setUrlList(prev => [...prev, trimmed]);
      setUrlInput("");
    } else if (trimmed) {
      toast({ variant: "destructive", title: "Invalid URL", description: "Please enter a valid URL" });
    }
  };

  const removeUrl = (index: number) => {
    setUrlList(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    uploadPreviews.forEach(p => URL.revokeObjectURL(p));
    setUploadedFiles([]);
    setUploadPreviews([]);
    setUrlList([]);
    setUrlInput("");
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
    try {
      setIsUploading(true);
      let finalImageUrls: string[] = [];

      if (imageTab === "upload") {
        if (uploadedFiles.length === 0) {
          toast({ variant: "destructive", title: "Image required", description: "Please upload at least one image" });
          setIsUploading(false);
          return;
        }
        const uploadPromises = uploadedFiles.map(f => uploadImage(f));
        finalImageUrls = await Promise.all(uploadPromises);
      } else {
        finalImageUrls = [...urlList];
        if (finalImageUrls.length === 0) {
          toast({ variant: "destructive", title: "Image required", description: "Please add at least one image URL" });
          setIsUploading(false);
          return;
        }
      }

      await createProduct.mutateAsync({
        category_id: data.category_id,
        image_urls: finalImageUrls,
        prompt: data.prompt,
        platform: data.platform,
        product_type_id: data.product_type_id || null,
        description: data.description || null,
        made_by: data.made_by || null,
        note: data.note || null,
      });

      toast({
        title: "Product created",
        description: "The product has been added successfully.",
      });
      
      form.reset();
      clearAll();
      setImageTab("upload");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create product",
      });
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
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new product.
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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

            {/* Multi Image Upload/URL Section */}
            <div className="space-y-2">
              <FormLabel>Product Images</FormLabel>
              <Tabs value={imageTab} onValueChange={(v) => setImageTab(v as "upload" | "url")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value="url" className="gap-2">
                    <Link className="h-4 w-4" />
                    URLs
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-3">
                  <div className="space-y-3">
                    {/* Preview grid */}
                    {uploadPreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {uploadPreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-24 object-cover rounded-lg border"
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
                    <div
                      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload images
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, WEBP — select multiple files
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="url" className="mt-3">
                  <div className="space-y-3">
                    {urlList.length > 0 && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {urlList.map((url, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <img src={url} alt="" className="h-8 w-8 rounded object-cover border flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            <span className="truncate flex-1 text-muted-foreground">{url}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => removeUrl(index)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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
                Add Product
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
