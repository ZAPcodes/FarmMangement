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
import { ProductWithDetails, Profile, OrderWithDetails, ProductStatus } from "@/types/database.types";
import { useToast } from "@/components/ui/use-toast";

interface FarmerSalesData {
  id: number;
  farmer_id: string;
  total_amount: number;
  last_updated: string;
  profiles: {
    name: string;
  } | null;
}

interface LowStockAlert {
  alert_id: number;
  product_id: number;
  farmer_id: string;
  product_name: string;
  current_stock: number;
  created_at: string;
  is_read: boolean;
  farmer?: {
    name: string;
  };
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const STATUS_NAMES = {
  1: "Pending",
  2: "Confirmed",
  3: "Shipped",
  4: "Delivered",
  5: "Cancelled"
};

const getStatusName = (status: any) => {
  if (!status) return STATUS_NAMES[1];
  if (typeof status === 'number') return STATUS_NAMES[status];
  if (status.status_id) return STATUS_NAMES[status.status_id];
  return STATUS_NAMES[1];
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
  const [totalSales, setTotalSales] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [farmerSales, setFarmerSales] = useState<Array<{
    farmer_id: string;
    farmer_name: string;
    total_amount: number;
    last_updated: string;
  }>>([]);

  // Add a function to get status ID mapping
  const STATUS_MAP = {
    PENDING: 1,
    PROCESSING: 2,
    SHIPPED: 3,
    DELIVERED: 4,
    CANCELLED: 5
  };

  useEffect(() => {
    fetchData();

    // Subscribe to real-time updates for orders
    const ordersSubscription = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            // Fetch the complete updated order with all relations
            const { data: updatedOrder, error } = await supabase
              .from("orders")
              .select(`
                *,
                buyer:profiles(id, name, email),
                status:order_status(status_id, name),
                order_items(
                  quantity,
                  price_per_unit,
                  product:products(
                    name,
                    price
                  )
                )
              `)
              .eq("order_id", payload.new.order_id)
              .single();

            if (!error && updatedOrder) {
              setOrders(prevOrders =>
                prevOrders.map(order =>
                  order.order_id === updatedOrder.order_id ? updatedOrder : order
                )
              );
            }
          }
        }
      )
      .subscribe();

    // Subscribe to real-time updates for total_sales
    const totalSalesSubscription = supabase
      .channel('total_sales_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'total_sales'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTotalSales(payload.new.total_amount || 0);
          }
        }
      )
      .subscribe();

    // Subscribe to real-time updates for farmer_sales
    const farmerSalesSubscription = supabase
      .channel('farmer_sales_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'farmer_sales'
        },
        async () => {
          // Refetch all farmer sales when any change occurs
          await fetchFarmerSales();
        }
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
      totalSalesSubscription.unsubscribe();
      farmerSalesSubscription.unsubscribe();
    };
  }, []);

  const fetchFarmerSales = async () => {
    try {
      const { data: salesData, error: salesError } = await supabase
        .from('farmer_sales')
        .select('total_amount');

      if (salesError) throw salesError;

      // Calculate total sales across all farmers
      const totalFarmerSales = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      setTotalSales(totalFarmerSales);

    } catch (error: any) {
      console.error('Error fetching farmer sales:', error);
      toast({
        title: 'Error fetching sales data',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all products with their relationships
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(*),
          farmer:profiles(id, name)
        `)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Calculate metrics
      const pendingProducts = productsData?.filter(product => product.status === "Pending").length || 0;
      setPendingApprovals(pendingProducts);

      // Fetch total users
      const { count: usersCount, error: usersError } = await supabase
        .from("profiles")
        .select("*", { count: 'exact', head: true });

      if (usersError) throw usersError;
      setTotalUsers(usersCount || 0);

      // Fetch all users for the users table
      const { data: usersData, error: usersFetchError } = await supabase
        .from("profiles")
        .select("*")
        .order('created_at', { ascending: false });

      if (usersFetchError) throw usersFetchError;
      setUsers(usersData || []);

      // Fetch orders with their items
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          buyer:profiles(id, name, email),
          status:order_status(status_id, name),
          order_items(
            quantity,
            price_per_unit,
            product:products(
              name,
              price
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Fetch total sales from farmer_sales
      const { data: salesData, error: salesError } = await supabase
        .from('farmer_sales')
        .select('total_amount');

      if (salesError) throw salesError;

      // Calculate total sales
      const totalAmount = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      setTotalSales(totalAmount);

      // Fetch farmer sales with farmer details
      const { data: farmerSalesData, error: farmerSalesError } = await supabase
        .from('farmer_sales')
        .select('farmer_id, total_amount, last_updated')
        .order('total_amount', { ascending: false });

      if (farmerSalesError) throw farmerSalesError;

      // Fetch farmer names separately
      const farmerIds = farmerSalesData?.map(sale => sale.farmer_id) || [];
      const { data: farmersData, error: farmersError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', farmerIds);

      if (farmersError) throw farmersError;

      // Create a map of farmer IDs to names
      const farmerNames = new Map(farmersData?.map(farmer => [farmer.id, farmer.name]));

      // Format farmer sales data
      const formattedFarmerSales = farmerSalesData?.map(sale => ({
        farmer_id: sale.farmer_id,
        farmer_name: farmerNames.get(sale.farmer_id) || 'Unknown Farmer',
        total_amount: sale.total_amount || 0,
        last_updated: sale.last_updated
      })) || [];

      setFarmerSales(formattedFarmerSales);

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

  const updateProductStatus = async (productId: number, newStatus: "Pending" | "Approved" | "Rejected") => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('product_id', productId);

      if (error) {
        console.error('Error updating status:', error);
        toast({
          title: "Error",
          description: `Failed to update product status: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Product status updated to ${newStatus}`,
      });

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the product status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // First, let's add a function to check if we have admin access
  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      return profile?.role === 'Admin';
    } catch (error) {
      console.error('Error checking admin access:', error);
      return false;
    }
  };

  const updateOrderStatus = async (orderId: number, newStatusId: number) => {
    try {
      setIsLoading(true);
      console.log(`Attempting to update order ${orderId} to status ${newStatusId}`);

      // First, get the current product stock levels
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          item_id,
          order_id,
          product_id,
          quantity,
          price_per_unit,
          product:products(
            product_id,
            name,
            farmer_id,
            stock
          )
        `)
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;
      
      if (orderItems && orderItems.length > 0) {
        console.log('Current product stock levels:', orderItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product?.name,
          current_stock: item.product?.stock,
          order_quantity: item.quantity,
          expected_new_stock: item.product?.stock - (newStatusId === 4 ? item.quantity : 0)
        })));
      }

      // Perform the status update
      const { data: updateData, error: updateError } = await supabase
        .from('orders')
        .update({ status_id: newStatusId })
        .eq('order_id', orderId)
        .select();

      if (updateError) throw updateError;

      // Check the updated stock levels
      if (orderItems && orderItems.length > 0) {
        const { data: updatedProducts, error: stockError } = await supabase
          .from('products')
          .select('product_id, name, stock')
          .in('product_id', orderItems.map(item => item.product_id));

        if (!stockError && updatedProducts) {
          console.log('Updated product stock levels:', updatedProducts);
        }
      }

      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.order_id === orderId 
            ? { ...order, status_id: newStatusId }
            : order
        )
      );

      toast({
        title: "Status updated",
        description: `Order #${orderId} status has been updated to ${STATUS_NAMES[newStatusId]}`,
      });

      // Refresh data to get updated stock levels
      await fetchData();

    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error updating status",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total Farmer Sales</CardTitle>
          <CardDescription>Combined sales across all farmers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(totalSales)}</div>
        </CardContent>
      </Card>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

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
                            <Select 
                              value={order.status_id?.toString()}
                              onValueChange={(value) => {
                                console.log("Selected status value:", value);
                                updateOrderStatus(order.order_id, parseInt(value));
                              }}
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue>
                                  {getStatusName(order.status_id)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Pending</SelectItem>
                                <SelectItem value="2">Confirmed</SelectItem>
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
                        <TableCell colSpan={5} className="text-center py-4 text-gray-500">
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
