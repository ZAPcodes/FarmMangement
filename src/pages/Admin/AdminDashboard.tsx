
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Bell,
  Filter,
  AlertTriangle,
  Package,
  User,
  Check,
  X,
} from "lucide-react";
import { ProductWithDetails, Profile, OrderWithDetails } from "@/types/database.types";
import { useToast } from "@/components/ui/use-toast";

// Helper function to format dates
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Helper function to get status name safely
const getStatusName = (status: OrderWithDetails['status']) => {
  if (!status) return "Unknown";
  if (typeof status === 'string') return status;
  return status.name || "Unknown";
};

const AdminDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [userFilter, setUserFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [orderFilter, setOrderFilter] = useState("all");
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch users - get all users, not just the current admin
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*");
      
      if (usersError) throw usersError;
      setUsers(usersData as Profile[]);
      setTotalUsers(usersData?.length || 0);

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(*),
          farmer:profiles(*)
        `);
      if (productsError) throw productsError;
      setProducts(productsData as ProductWithDetails[]);

      // Fetch orders with proper relationship - improved query
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          buyer:profiles(*),
          status:order_status(*)
        `)
        .order('created_at', { ascending: false });
      
      if (ordersError) throw ordersError;
      
      console.log("Admin dashboard - Orders data:", ordersData);
      setOrders(ordersData as unknown as OrderWithDetails[] || []);

      // Calculate stats
      const pending = productsData?.filter(product => product.status === "Pending")?.length || 0;
      const lowStock = productsData?.filter(product => product.stock < 10)?.length || 0;
      const sales = ordersData?.reduce((acc, order) => acc + (order.total_price || 0), 0) || 0;

      setPendingApprovals(pending);
      setLowStockProducts(lowStock);
      setTotalSales(sales);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update product status function
  const updateProductStatus = async (productId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ status: newStatus })
        .eq("product_id", productId);

      if (error) throw error;

      // Update the local state
      setProducts(products.map(product => 
        product.product_id === productId 
          ? { ...product, status: newStatus } 
          : product
      ));

      toast({
        title: "Status updated",
        description: `Product status has been updated to ${newStatus}`,
      });
    } catch (error: any) {
      console.error("Error updating product status:", error);
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Update order status function
  const updateOrderStatus = async (orderId: number, newStatusId: number) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status_id: newStatusId })
        .eq("order_id", orderId);

      if (error) throw error;

      // Fetch the updated order to get the full status object
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(`
          *,
          buyer:profiles(*),
          status:order_status(*)
        `)
        .eq("order_id", orderId)
        .single();

      if (fetchError) throw fetchError;

      // Update the local state
      setOrders(orders.map(order => 
        order.order_id === orderId ? (data as unknown as OrderWithDetails) : order
      ));

      toast({
        title: "Order status updated",
        description: `Order status has been updated successfully`,
      });
    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error updating order status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter functions
  const filteredUsers = users.filter(user => {
    if (userFilter === "all") return true;
    return user.role === userFilter;
  });

  const filteredProducts = products.filter(product => {
    if (productFilter === "all") return true;
    return product.status === productFilter;
  });

  const filteredOrders = orders.filter(order => {
    if (orderFilter === "all") return true;
    return getStatusName(order.status) === orderFilter;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Monitor your store's performance and manage products, orders, and
          users.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
            <CardDescription>Registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
            <CardDescription>Revenue generated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Products awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Products</CardTitle>
            <CardDescription>Products with stock less than 10</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockProducts}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Product Management</CardTitle>
                <CardDescription>
                  Manage product listings and approvals
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.product_id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category?.name || "N/A"}</TableCell>
                        <TableCell>{product.farmer?.name || "N/A"}</TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{product.status}</Badge>
                        </TableCell>
                        <TableCell>{product.avgRating || 0}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {product.status === "Pending" && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 w-8 p-0 text-green-600"
                                  onClick={() => updateProductStatus(product.product_id, "Approved")}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 w-8 p-0 text-red-600"
                                  onClick={() => updateProductStatus(product.product_id, "Rejected")}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {product.status === "Rejected" && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 text-green-600"
                                onClick={() => updateProductStatus(product.product_id, "Approved")}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {product.status === "Approved" && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 text-red-600"
                                onClick={() => updateProductStatus(product.product_id, "Rejected")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>
                  Track and manage customer orders
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={orderFilter} onValueChange={setOrderFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Shipped">Shipped</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Order ID</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order) => (
                        <TableRow key={order.order_id}>
                          <TableCell className="font-medium">{order.order_id}</TableCell>
                          <TableCell>{order.buyer?.name || "N/A"}</TableCell>
                          <TableCell>{formatCurrency(order.total_price || 0)}</TableCell>
                          <TableCell>{formatDate(order.created_at)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{getStatusName(order.status)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Select 
                              onValueChange={(value) => updateOrderStatus(order.order_id, parseInt(value))}
                              defaultValue={order.status_id?.toString() || "1"}
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="Update Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Pending</SelectItem>
                                <SelectItem value="2">Processing</SelectItem>
                                <SelectItem value="3">Shipped</SelectItem>
                                <SelectItem value="4">Delivered</SelectItem>
                                <SelectItem value="5">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                          No orders found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts and permissions
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Farmer">Farmer</SelectItem>
                    <SelectItem value="Buyer">Buyer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">User ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.id}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.role}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
