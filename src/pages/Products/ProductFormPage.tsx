import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Product,
  Category,
  ProductStatus,
} from "@/types/database.types";
import { supabase } from "@/integrations/supabase/client";
import { Package } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Product name must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  price: z.number().min(0.01, {
    message: "Price must be greater than 0.",
  }),
  stock: z.number().min(0, {
    message: "Stock must be at least 0.",
  }),
  image_url: z.string().url({
    message: "Please enter a valid URL.",
  }).optional(),
  category_id: z.string().min(1, {
    message: "Please select a category.",
  })
});

const ProductFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      stock: 0,
      image_url: "",
      category_id: "",
    },
  });

  useEffect(() => {
    checkUserRole();
    fetchCategories();
    if (id) {
      fetchProduct(id);
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to create products",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.role !== 'Farmer') {
        toast({
          title: "Access Denied",
          description: "Only farmers can create or edit products",
          variant: "destructive",
        });
        navigate("/products");
        return;
      }

      setCurrentUser({ id: user.id, role: profile.role });
    } catch (error: any) {
      console.error("Error checking user role:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/products");
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error fetching categories",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchProduct = async (productId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("product_id", parseInt(productId))
        .single();

      if (error) throw error;

      const parsedProduct = {
        ...data,
        price: parseFloat(data.price),
        stock: parseInt(data.stock.toString()),
        category_id: data.category_id?.toString() || "",
      };

      form.reset({
        name: parsedProduct.name,
        description: parsedProduct.description || "",
        price: parsedProduct.price,
        stock: parsedProduct.stock,
        image_url: parsedProduct.image_url || "",
        category_id: parsedProduct.category_id,
      });

      setProduct(parsedProduct);
    } catch (error: any) {
      console.error("Error fetching product:", error);
      toast({
        title: "Error fetching product",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create products",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const formData = {
        name: values.name,
        description: values.description,
        price: values.price,
        stock: values.stock,
        image_url: values.image_url || null,
        category_id: values.category_id ? parseInt(values.category_id) : null,
        status: "Pending",
        farmer_id: currentUser.id
      };

      if (id) {
        const { data: existingProduct, error: fetchError } = await supabase
          .from("products")
          .select("farmer_id, status")
          .eq("product_id", parseInt(id))
          .single();

        if (fetchError) throw fetchError;

        if (existingProduct.farmer_id !== currentUser.id) {
          throw new Error("You can only edit your own products");
        }

        const { error } = await supabase
          .from("products")
          .update({
            ...formData,
            status: existingProduct.status
          })
          .eq("product_id", parseInt(id));

        if (error) throw error;

        toast({
          title: "Product updated",
          description: `${values.name} has been updated successfully`,
        });
      } else {
        const { error } = await supabase
          .from("products")
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Product created",
          description: `${values.name} has been created successfully and is pending approval`,
        });
      }

      navigate("/products");
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error submitting form",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>{id ? "Edit Product" : "Create New Product"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Product name" {...field} />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Product description"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col md:flex-row gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Image URL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.category_id} value={category.category_id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {id ? "Update Product" : "Create Product"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductFormPage;
