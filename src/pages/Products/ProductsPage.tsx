
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProductWithDetails } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Search, Filter, Edit, Trash2, Star } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ProductsPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories] = useState<{ category_id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithDetails | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [profile]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("products")
        .select(`
          *,
          category:categories(*),
          farmer:profiles(*)
        `);

      if (profile?.role === "Farmer") {
        query = query.eq("farmer_id", profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch ratings for products
      const productsWithRatings = await Promise.all((data || []).map(async (product) => {
        const { data: ratingsData, error: ratingsError } = await supabase
          .from("ratings")
          .select("rating")
          .eq("product_id", product.product_id);
        
        if (ratingsError) {
          console.error("Error fetching ratings:", ratingsError);
          return { ...product, avgRating: 0 };
        }
        
        if (ratingsData && ratingsData.length > 0) {
          const totalRating = ratingsData.reduce((sum, item) => sum + item.rating, 0);
          const avgRating = totalRating / ratingsData.length;
          return { ...product, avgRating };
        }
        
        return { ...product, avgRating: 0 };
      }));
      
      setProducts(productsWithRatings as ProductWithDetails[]);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error fetching products",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("category_id, name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("product_id", productToDelete.product_id);

      if (error) throw error;

      setProducts(products.filter(p => p.product_id !== productToDelete.product_id));
      toast({
        title: "Product deleted",
        description: "The product has been removed successfully.",
      });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error deleting product",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setProductToDelete(null);
    }
  };

  const handleAddNewProduct = () => {
    navigate("/products/new");
  };

  const handleEditProduct = (product: ProductWithDetails) => {
    navigate(`/products/${product.product_id}`);
  };

  const confirmDeleteProduct = (product: ProductWithDetails) => {
    setProductToDelete(product);
    setShowDeleteDialog(true);
  };

  const filteredProducts = products.filter(product => {
    const nameMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatch = categoryFilter ? product.category_id === parseInt(categoryFilter) : true;
    const statusMatch = statusFilter ? product.status === statusFilter : true;
    return nameMatch && categoryMatch && statusMatch;
  });

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "Rejected":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">
            {profile?.role === "Farmer" ? "Manage your product listings" : "Browse all products"}
          </p>
        </div>
        {profile?.role === "Farmer" && (
          <Button onClick={handleAddNewProduct} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Add New Product
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Listings</CardTitle>
          <CardDescription>
            {profile?.role === "Farmer"
              ? "View and manage your product listings"
              : "Browse all available products"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.category_id} value={category.category_id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {profile?.role !== "Buyer" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-10">
              <Package className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-gray-500">
                {profile?.role === "Farmer"
                  ? "Start adding products to your store."
                  : "Try adjusting your search filters."}
              </p>
              {profile?.role === "Farmer" && (
                <Button
                  onClick={handleAddNewProduct}
                  className="mt-4 bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Product
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.product_id} className="flex flex-col h-full">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-lg truncate" title={product.name}>
                        {product.name}
                      </CardTitle>
                      {profile?.role !== "Buyer" && (
                        <Badge className={getStatusBadgeColor(product.status)}>
                          {product.status}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {product.category?.name || "Uncategorized"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="h-40 bg-gray-100 rounded-md mb-4 flex items-center justify-center">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover rounded-md"
                        />
                      ) : (
                        <Package className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-lg font-bold">${product.price}</p>
                        <div className="flex items-center text-amber-500">
                          <Star className="h-4 w-4 fill-current mr-1" />
                          <span>{product.avgRating?.toFixed(1) || "0.0"}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-3">
                        {product.description || "No description available."}
                      </p>
                      <p className="text-sm">
                        Stock: <span className="font-medium">{product.stock}</span>
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <div className="flex justify-between w-full">
                      {profile?.role === "Farmer" && profile.id === product.farmer_id ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => handleEditProduct(product)}
                            className="flex-1 mr-2"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => confirmDeleteProduct(product)}
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </>
                      ) : (
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          disabled={!product.stock || product.status !== "Approved"}
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the product "{productToDelete?.name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsPage;
