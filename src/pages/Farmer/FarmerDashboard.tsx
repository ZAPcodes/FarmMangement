
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  CreditCard, 
  Package, 
  TrendingUp, 
  AlertTriangle,
  Plus 
} from "lucide-react";
import { ProductWithDetails } from "@/types/database.types";
import { toast } from "@/components/ui/use-toast";

const FarmerDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSales, setTotalSales] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [pendingProducts, setPendingProducts] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<ProductWithDetails[]>([]);

  useEffect(() => {
    if (profile) {
      fetchFarmerData();
    }
  }, [profile]);

  const fetchFarmerData = async () => {
    setIsLoading(true);
    try {
      // Fetch farmer's products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(*)
        `)
        .eq("farmer_id", profile?.id);

      if (productsError) throw productsError;

      setProducts(productsData || []);
      setTotalProducts(productsData?.length || 0);
      setPendingProducts(productsData?.filter(p => p.status === "Pending").length || 0);
      setLowStockProducts(productsData?.filter(p => p.stock < 10) || []);

      // Fetch total sales (simplified version - in reality, would calculate from orders)
      setTotalSales(
        productsData?.reduce((acc, curr) => {
          // Mock sales calculation - in a real app, this would come from actual sales data
          return acc + (curr.price * 5); // Assuming each product has sold 5 units on average
        }, 0) || 0
      );
    } catch (error: any) {
      console.error("Error fetching farmer data:", error);
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewProduct = () => {
    navigate("/products/new");
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {profile?.name}</p>
        </div>
        <Button onClick={handleAddNewProduct} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add New Product
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <CreditCard className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">+12% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-gray-500 mt-1">
              {pendingProducts > 0 ? `${pendingProducts} pending approval` : "All approved"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8</div>
            <p className="text-xs text-gray-500 mt-1">Based on 24 reviews</p>
          </CardContent>
        </Card>
        
        <Card className={lowStockProducts.length > 0 ? "border-orange-300 bg-orange-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${lowStockProducts.length > 0 ? "text-orange-700" : ""}`}>
              Low Stock Alert
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${lowStockProducts.length > 0 ? "text-orange-500" : "text-gray-500"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStockProducts.length > 0 ? "text-orange-700" : ""}`}>
              {lowStockProducts.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Products need restocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity and inventory overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock products */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Low Stock Products</CardTitle>
            <CardDescription>Products that need restocking soon</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length > 0 ? (
              <div className="space-y-4">
                {lowStockProducts.map((product) => (
                  <div key={product.product_id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        {product.category ? product.category.name : "Uncategorized"} · ${product.price}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        product.stock < 5 ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"
                      }`}>
                        {product.stock} left
                      </span>
                      <Button variant="ghost" size="sm" className="ml-2">
                        Restock
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>All products are well-stocked</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales chart (placeholder) */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Weekly Sales</CardTitle>
            <CardDescription>Your earnings over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <BarChart3 className="h-16 w-16 text-gray-300" />
              <p className="text-gray-500 ml-4">Sales chart will be displayed here</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent products */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Products</CardTitle>
          <CardDescription>Your recently added products</CardDescription>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-sm font-medium">Product</th>
                    <th className="pb-3 text-sm font-medium">Price</th>
                    <th className="pb-3 text-sm font-medium">Stock</th>
                    <th className="pb-3 text-sm font-medium">Status</th>
                    <th className="pb-3 text-sm font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 5).map((product) => (
                    <tr key={product.product_id} className="border-b">
                      <td className="py-3 text-sm">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded bg-gray-100 mr-3 flex items-center justify-center">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name} 
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-gray-500">
                              {product.category ? product.category.name : "Uncategorized"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-sm">${product.price}</td>
                      <td className="py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          product.stock < 5 ? "bg-red-100 text-red-800" : 
                          product.stock < 10 ? "bg-orange-100 text-orange-800" : 
                          "bg-green-100 text-green-800"
                        }`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          product.status === "Approved" ? "bg-green-100 text-green-800" : 
                          product.status === "Pending" ? "bg-yellow-100 text-yellow-800" : 
                          "bg-red-100 text-red-800"
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-right">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>No products found. Add your first product!</p>
              <Button className="mt-4 bg-green-600 hover:bg-green-700">Add Product</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerDashboard;
