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
import { useCreateProduct, useProductTypes, useCategories } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const productSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  category_id: z.string().min(1, "Category is required"),
  description: z.string().max(1000, "Description too long").optional(),
  image_url: z.string().url("Must be a valid URL"),
  prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt too long"),
  platform: z.enum(["amazon", "shopify", "meta", "other"]),
  product_type_id: z.string().optional(),
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

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      category_id: "",
      description: "",
      image_url: "",
      prompt: "",
      platform: "amazon",
      product_type_id: undefined,
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    try {
      await createProduct.mutateAsync({
        title: data.title,
        category_id: data.category_id,
        image_url: data.image_url,
        prompt: data.prompt,
        platform: data.platform,
        product_type_id: data.product_type_id || null,
        description: data.description || null,
      });
      toast({
        title: "Product created",
        description: "The product has been added successfully.",
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create product",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new product.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Product title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
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

            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Product description..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createProduct.isPending}>
                {createProduct.isPending && (
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
