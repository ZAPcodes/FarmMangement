
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
  Users, 
  ShoppingCart, 
  PackageCheck, 
  TrendingUp,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { ProductWithDetails, Profile } from "@/types/database.types";
import { toast } from "@/components/ui/use-toast";

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [pendingProducts, setPendingProducts] = useState<ProductWithDetails[]>([]);
  const [recentUsers, setRecentUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    salesAmount: 0
  });

  useEffect(() => {
    if (profile && profile.role === "Admin") {
      fetchAdminData();
    }
  }, [profile]);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      // Fetch pending products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(*),
          farmer:profiles(*)
        `)
        .eq("status", "Pending")
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;
      setPendingProducts(productsData || []);

      // Fetch recent users
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (usersError) throw usersError;
      setRecentUsers(usersData || []);

      // Fetch stats
      const [
        { count: userCount },
        { count: productCount },
        { count: orderCount },
        { data: orderData }
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("products").select("product_id", { count: "exact", head: true }),
        supabase.from("orders").select("order_id", { count: "exact", head: true }),
        supabase.from("orders").select("total_price")
      ]);

      setStats({
        totalUsers: userCount || 0,
        totalProducts: productCount || 0,
        totalOrders: orderCount || 0,
        salesAmount: orderData?.reduce((sum, order) => sum + Number(order.total_price), 0) || 0
      });
    } catch (error: any) {
      console.error("Error fetching admin data:", error);
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveProduct = async (productId: number) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ status: "Approved" })
        .eq("product_id", productId);

      if (error) throw error;

      setPendingProducts(pendingProducts.filter(p => p.product_id !== productId));
      
      toast({
        title: "Product approved",
        description: "The product has been approved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error approving product",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectProduct = async (productId: number) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ status: "Rejected" })
        .eq("product_id", productId);

      if (error) throw error;

      setPendingProducts(pendingProducts.filter(p => p.product_id !== productId));
      
      toast({
        title: "Product rejected",
        description: "The product has been rejected.",
      });
    } catch (error: any) {
      toast({
        title: "Error rejecting product",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  if (profile?.role !== "Admin") {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-500 mt-2">You don't have permission to access the admin dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">System overview and management</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-gray-500 mt-1">Registered users</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <PackageCheck className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-gray-500 mt-1">
              {pendingProducts.length > 0 ? `${pendingProducts.length} pending approval` : "All approved"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-gray-500 mt-1">Processed on platform</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.salesAmount.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Total sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending products approval */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Products</CardTitle>
          <CardDescription>Products awaiting approval</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingProducts.length > 0 ? (
            <div className="space-y-4">
              {pendingProducts.map((product) => (
                <div key={product.product_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center mb-4 sm:mb-0">
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center mr-4">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <PackageCheck className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-gray-500">
                        {product.category?.name || "Uncategorized"} · ${product.price}
                      </p>
                      <p className="text-xs text-gray-500">
                        By: {product.farmer?.name || "Unknown Farmer"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleRejectProduct(product.product_id)}
                      variant="outline" 
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button 
                      onClick={() => handleApproveProduct(product.product_id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>No pending products to approve</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent users */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>Recently joined users</CardDescription>
        </CardHeader>
        <CardContent>
          {recentUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-sm font-medium">User</th>
                    <th className="pb-3 text-sm font-medium">Email</th>
                    <th className="pb-3 text-sm font-medium">Role</th>
                    <th className="pb-3 text-sm font-medium">Joined</th>
                    <th className="pb-3 text-sm font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="py-3 text-sm font-medium">{user.name}</td>
                      <td className="py-3 text-sm">{user.email}</td>
                      <td className="py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.role === "Admin" ? "bg-purple-100 text-purple-800" : 
                          user.role === "Farmer" ? "bg-green-100 text-green-800" : 
                          "bg-blue-100 text-blue-800"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
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
              <p>No users found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
