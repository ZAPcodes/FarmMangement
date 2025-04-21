
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  ShoppingCart, 
  PackageCheck, 
  TrendingUp,
  CheckCircle2,
  XCircle,
  BarChart3,
  Bell,
  Filter,
  AlertTriangle,
  Package
} from "lucide-react";
import { ProductWithDetails, Profile, OrderWithDetails } from "@/types/database.types";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [pendingProducts, setPendingProducts] = useState<ProductWithDetails[]>([]);
  const [recentUsers, setRecentUsers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [allProducts, setAllProducts] = useState<ProductWithDetails[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<ProductWithDetails[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [productDetails, setProductDetails] = useState<ProductWithDetails | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("");
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    salesAmount: 0,
    pendingApprovals: 0,
    lowStockCount: 0,
    popularProducts: []
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
      setPendingProducts(productsData as unknown as ProductWithDetails[] || []);

      // Fetch all products for product management
      const { data: allProductsData, error: allProductsError } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(*),
          farmer:profiles(*)
        `)
        .order("created_at", { ascending: false });

      if (allProductsError) throw allProductsError;
      const products = allProductsData as unknown as ProductWithDetails[] || [];
      setAllProducts(products);
      
      // Find low stock products (less than 10)
      const lowStock = products.filter(p => p.stock !== null && p.stock < 10 && p.status === "Approved");
      setLowStockProducts(lowStock);

      // Fetch recent users
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (usersError) throw usersError;
      setRecentUsers(usersData || []);

      // Fetch all users for user management
      const { data: allUsersData, error: allUsersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (allUsersError) throw allUsersError;
      setAllUsers(allUsersData || []);

      // Fetch recent orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          status:order_status(*),
          buyer:profiles(*),
          items:order_items(*, product:products(*))
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (ordersError) throw ordersError;
      setRecentOrders(ordersData as unknown as OrderWithDetails[] || []);

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
        salesAmount: orderData?.reduce((sum, order) => sum + Number(order.total_price), 0) || 0,
        pendingApprovals: productsData?.length || 0,
        lowStockCount: lowStock.length,
        popularProducts: []
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

      // Find the product to get the farmer information
      const product = pendingProducts.find(p => p.product_id === productId);
      
      // Update the pending products list
      setPendingProducts(pendingProducts.filter(p => p.product_id !== productId));
      
      // Update the all products list
      setAllProducts(allProducts.map(p => 
        p.product_id === productId ? { ...p, status: "Approved" } : p
      ));
      
      // Update low stock products if applicable
      if (product && product.stock < 10) {
        setLowStockProducts([...lowStockProducts, {...product, status: "Approved" as const}]);
      }
      
      // Log activity
      if (product?.farmer?.id) {
        await supabase.from("log_activity").insert({
          user_id: product.farmer.id,
          action: "Product Approved",
          details: `Your product "${product.name}" has been approved by admin.`
        });
      }
      
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

      // Find the product to get the farmer information
      const product = pendingProducts.find(p => p.product_id === productId);
      
      // Update the pending products list
      setPendingProducts(pendingProducts.filter(p => p.product_id !== productId));
      
      // Update the all products list
      setAllProducts(allProducts.map(p => 
        p.product_id === productId ? { ...p, status: "Rejected" } : p
      ));
      
      // Log activity
      if (product?.farmer?.id) {
        await supabase.from("log_activity").insert({
          user_id: product.farmer.id,
          action: "Product Rejected",
          details: `Your product "${product.name}" has been rejected by admin.`
        });
      }
      
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

  const viewProductDetails = (product: ProductWithDetails) => {
    setProductDetails(product);
    setShowProductDetails(true);
  };

  const filteredUsers = allUsers.filter(user => {
    const nameMatch = user.name.toLowerCase().includes(userFilter.toLowerCase());
    const roleMatch = roleFilter ? user.role === roleFilter : true;
    return nameMatch && roleMatch;
  });

  const filteredProducts = allProducts.filter(product => {
    const nameMatch = product.name.toLowerCase().includes(productFilter.toLowerCase());
    const statusMatch = productStatusFilter ? product.status === productStatusFilter : true;
    return nameMatch && statusMatch;
  });

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

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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

          {/* Low Stock Alert */}
          {lowStockProducts.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="flex flex-row items-center pb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mr-2" />
                <CardTitle className="text-amber-800">Low Stock Alert</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lowStockProducts.slice(0, 3).map((product) => (
                    <div key={product.product_id} className="flex justify-between items-center p-3 bg-white rounded-md border border-amber-200">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mr-3">
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
                          <h3 className="font-medium text-sm">{product.name}</h3>
                          <p className="text-xs text-amber-600">Only {product.stock} left in stock</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewProductDetails(product)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                  
                  {lowStockProducts.length > 3 && (
                    <Button 
                      variant="link" 
                      onClick={() => {
                        setSelectedTab("products");
                        setProductStatusFilter("Approved");
                      }}
                      className="text-amber-700"
                    >
                      View all {lowStockProducts.length} low stock products
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
                          onClick={() => viewProductDetails(product)}
                          variant="outline"
                        >
                          View Details
                        </Button>
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
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Users</CardTitle>
                <CardDescription>Recently joined users</CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setSelectedTab("users")}
              >
                View All Users
              </Button>
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
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage all registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name"
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Roles</SelectItem>
                      <SelectItem value="Farmer">Farmer</SelectItem>
                      <SelectItem value="Buyer">Buyer</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredUsers.length > 0 ? (
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
                      {filteredUsers.map((user) => (
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
                            <Button variant="ghost" size="sm">View Details</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No users found matching your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Management</CardTitle>
              <CardDescription>View and manage all products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search by product name"
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-3 text-sm font-medium">Product</th>
                        <th className="pb-3 text-sm font-medium">Category</th>
                        <th className="pb-3 text-sm font-medium">Price</th>
                        <th className="pb-3 text-sm font-medium">Stock</th>
                        <th className="pb-3 text-sm font-medium">Status</th>
                        <th className="pb-3 text-sm font-medium">Farmer</th>
                        <th className="pb-3 text-sm font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.product_id} className="border-b">
                          <td className="py-3 text-sm font-medium">
                            <div className="flex items-center">
                              {product.name}
                              {product.stock !== null && product.stock < 10 && product.status === "Approved" && (
                                <Badge className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-100">
                                  Low Stock
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-sm">{product.category?.name || "Uncategorized"}</td>
                          <td className="py-3 text-sm">${product.price}</td>
                          <td className="py-3 text-sm">{product.stock}</td>
                          <td className="py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              product.status === "Approved" ? "bg-green-100 text-green-800" : 
                              product.status === "Pending" ? "bg-yellow-100 text-yellow-800" : 
                              "bg-red-100 text-red-800"
                            }`}>
                              {product.status}
                            </span>
                          </td>
                          <td className="py-3 text-sm">{product.farmer?.name || "Unknown"}</td>
                          <td className="py-3 text-sm text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => viewProductDetails(product)}
                            >
                              View
                            </Button>
                            {product.status === "Pending" && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleApproveProduct(product.product_id)}
                                  className="text-green-600"
                                >
                                  Approve
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleRejectProduct(product.product_id)}
                                  className="text-red-600"
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No products found matching your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Management</CardTitle>
              <CardDescription>View all orders and order details</CardDescription>
            </CardHeader>
            <CardContent>
              {recentOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-3 text-sm font-medium">Order ID</th>
                        <th className="pb-3 text-sm font-medium">Date</th>
                        <th className="pb-3 text-sm font-medium">Buyer</th>
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
                          <td className="py-3 text-sm">{order.buyer?.name || "Unknown"}</td>
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
                            <Button variant="ghost" size="sm">View Details</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No orders found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Details Dialog */}
      <Dialog open={showProductDetails} onOpenChange={setShowProductDetails}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              Detailed information about the product
            </DialogDescription>
          </DialogHeader>
          {productDetails && (
            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                {productDetails.image_url ? (
                  <img 
                    src={productDetails.image_url} 
                    alt={productDetails.name} 
                    className="max-h-[200px] object-contain rounded"
                  />
                ) : (
                  <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded">
                    <PackageCheck className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Name</h4>
                  <p>{productDetails.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Price</h4>
                  <p>${productDetails.price}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Category</h4>
                  <p>{productDetails.category?.name || "Uncategorized"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Stock</h4>
                  <div className="flex items-center">
                    <span className="mr-2">{productDetails.stock} units</span>
                    {productDetails.stock !== null && productDetails.stock < 10 && productDetails.status === "Approved" && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        Low Stock
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    productDetails.status === "Approved" ? "bg-green-100 text-green-800" : 
                    productDetails.status === "Pending" ? "bg-yellow-100 text-yellow-800" : 
                    "bg-red-100 text-red-800"
                  }`}>
                    {productDetails.status}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Farmer</h4>
                  <p>{productDetails.farmer?.name || "Unknown Farmer"}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Description</h4>
                <p className="text-sm mt-1">{productDetails.description || "No description provided."}</p>
              </div>
              
              {productDetails.status === "Pending" && (
                <div className="flex justify-end gap-2 mt-4">
                  <Button 
                    onClick={() => {
                      handleRejectProduct(productDetails.product_id);
                      setShowProductDetails(false);
                    }}
                    variant="outline" 
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button 
                    onClick={() => {
                      handleApproveProduct(productDetails.product_id);
                      setShowProductDetails(false);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
