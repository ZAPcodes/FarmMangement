import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Product, Category } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Package } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProductFormData {
  name: string;
  price: number | null;
  stock: number | null;
  category_id: number | null;
  description: string;
  image_url: string;
}

const ProductFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    price: null,
    stock: null,
    category_id: null,
    description: "",
    image_url: "",
  });

  useEffect(() => {
    if (id) {
      setIsEditing(true);
      fetchProduct(id);
    } else {
      setIsEditing(false);
      setFormData({
        name: "",
        price: null,
        stock: null,
        category_id: null,
        description: "",
        image_url: "",
      });
    }
    fetchCategories();
  }, [id]);

  const fetchProduct = async (productId: string) => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("product_id", productId)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name,
        price: data.price,
        stock: data.stock,
        category_id: data.category_id,
        description: data.description || "",
        image_url: data.image_url || "",
      });
    } catch (error: any) {
      console.error("Error fetching product:", error);
      toast({
        title: "Error fetching product",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!profile?.id) {
      toast({
        title: "Unauthorized",
        description: "You must be logged in to perform this action.",
        variant: "destructive",
      });
      return;
    }

    const productData = {
      ...formData,
      farmer_id: profile.id,
    };

    try {
      if (isEditing && id) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("product_id", id);

        if (error) throw error;

        toast({
          title: "Product updated",
          description: "Product has been updated successfully!",
        });
      } else {
        const { error } = await supabase.from("products").insert({
          ...productData,
          status: "Pending",
        });

        if (error) throw error;

        toast({
          title: "Product created",
          description: "Product has been created successfully!",
        });
      }
      navigate("/products");
    } catch (error: any) {
      console.error("Error creating/updating product:", error);
      toast({
        title: isEditing ? "Error updating product" : "Error creating product",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Package className="h-6 w-6 mr-2" />
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? "Edit Product" : "Add New Product"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>
            {isEditing
              ? "Update your product details below"
              : "Fill in the details to list your product"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  placeholder="Enter product name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.stock || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id?.toString() || "0"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category_id: parseInt(value) || null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    {categories.map((category) => (
                      <SelectItem 
                        key={category.category_id} 
                        value={category.category_id.toString()}
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your product..."
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Product Image</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    id="image_url"
                    type="text"
                    placeholder="Image URL (optional)"
                    value={formData.image_url || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, image_url: e.target.value })
                    }
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter a URL to an image or upload one →
                  </p>
                </div>
                <div className="bg-gray-50 flex items-center justify-center border border-dashed rounded-md h-[120px] relative">
                  {/* This would be where we'd handle image upload if we implemented it */}
                  {formData.image_url ? (
                    <img
                      src={formData.image_url}
                      alt="Product preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Camera className="h-10 w-10 mx-auto text-gray-400" />
                      <p className="mt-1 text-sm text-gray-500">
                        Preview will appear here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/products")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-t-0 border-gray-300 rounded-full"></div>
                    {isEditing ? "Updating..." : "Saving..."}
                  </div>
                ) : isEditing ? (
                  "Update Product"
                ) : (
                  "Save Product"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductFormPage;
