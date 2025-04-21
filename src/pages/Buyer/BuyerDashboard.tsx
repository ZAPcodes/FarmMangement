
import { useEffect, useState } from "react";
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
  ShoppingCart, 
  Package, 
  Search,
  Star 
} from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ProductWithDetails, OrderWithDetails } from "@/types/database.types";
import { toast } from "@/components/ui/use-toast";

const BuyerDashboard = () => {
  const { profile } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState<ProductWithDetails[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (profile) {
      fetchBuyerData();
    }
  }, [profile]);

  const fetchBuyerData = async () => {
    setIsLoading(true);
    try {
      // Fetch featured products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(*),
          farmer:profiles(id, name)
        `)
        .eq("status", "Approved")
        .order("created_at", { ascending: false })
        .limit(6);

      if (productsError) throw productsError;
      setFeaturedProducts(productsData || []);

      // Fetch buyer's recent orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          status:order_status(*)
        `)
        .eq("buyer_id", profile?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (ordersError) throw ordersError;
      setRecentOrders(ordersData || []);
    } catch (error: any) {
      console.error("Error fetching buyer data:", error);
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Will implement search functionality
    toast({
      title: "Search functionality",
      description: `Searching for "${searchQuery}"...`,
    });
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Buyer Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {profile?.name}</p>
      </div>

      {/* Search bar */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search for products..."
                className="pl-10"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentOrders.length}</div>
            <p className="text-xs text-gray-500 mt-1">From your account</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Marketplace</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featuredProducts.length}+</div>
            <p className="text-xs text-gray-500 mt-1">Products available</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Your Ratings</CardTitle>
            <Star className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-gray-500 mt-1">Products rated so far</p>
          </CardContent>
        </Card>
      </div>

      {/* Featured products */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Featured Products</CardTitle>
            <CardDescription>Discover fresh produce from local farmers</CardDescription>
          </div>
          <Link to="/marketplace">
            <Button variant="outline">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredProducts.map((product) => (
              <div key={product.product_id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="w-full h-40 bg-gray-100">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{product.name}</h3>
                    <span className="text-green-600 font-medium">${product.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>{product.category?.name || "Uncategorized"}</span>
                    <div className="flex items-center">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                      <span>4.5</span>
                    </div>
                  </div>
                  <Button className="w-full bg-green-600 hover:bg-green-700">Add to Cart</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Your order history</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-sm font-medium">Order ID</th>
                    <th className="pb-3 text-sm font-medium">Date</th>
                    <th className="pb-3 text-sm font-medium">Total</th>
                    <th className="pb-3 text-sm font-medium">Status</th>
                    <th className="pb-3 text-sm font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.order_id} className="border-b">
                      <td className="py-3 text-sm font-medium">#{order.order_id}</td>
                      <td className="py-3 text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-sm">${order.total_price}</td>
                      <td className="py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          order.status?.name === "Delivered" ? "bg-green-100 text-green-800" : 
                          order.status?.name === "Confirmed" ? "bg-blue-100 text-blue-800" : 
                          order.status?.name === "Shipped" ? "bg-indigo-100 text-indigo-800" :
                          order.status?.name === "Cancelled" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {order.status?.name || "Processing"}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-right">
                        <Button variant="ghost" size="sm">View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>No orders found. Start shopping on the marketplace!</p>
              <Link to="/marketplace">
                <Button className="mt-4 bg-green-600 hover:bg-green-700">Browse Products</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyerDashboard;
