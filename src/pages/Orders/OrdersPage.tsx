
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { OrderWithDetails } from "@/types/database.types";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Filter, ShoppingCart } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Helper function to get status name safely
const getStatusName = (status: OrderWithDetails['status']) => {
  if (!status) return "Unknown";
  if (typeof status === 'string') return status;
  return status.name || "Unknown";
};

const OrdersPage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (profile) {
      fetchOrders();
    }
  }, [profile]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("orders")
        .select(`
          *,
          buyer:profiles(*),
          status:order_status(*),
          order_items:order_items(
            *,
            product:products(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (profile?.role === "Farmer") {
        // For farmers, we need a more complex query to get orders for their products
        // First, get the farmer's products
        const { data: farmerProducts, error: productError } = await supabase
          .from("products")
          .select("product_id")
          .eq("farmer_id", profile.id);
          
        if (productError) throw productError;
        
        if (farmerProducts && farmerProducts.length > 0) {
          // Get order items that include these products
          const productIds = farmerProducts.map(p => p.product_id);
          
          // Get orders related to these items
          const { data: orderItemsData, error: orderItemsError } = await supabase
            .from("order_items")
            .select("order_id")
            .in("product_id", productIds);
            
          if (orderItemsError) throw orderItemsError;
          
          if (orderItemsData && orderItemsData.length > 0) {
            const orderIds = [...new Set(orderItemsData.map(item => item.order_id))];
            
            // Now get these orders
            const { data: ordersData, error: ordersError } = await supabase
              .from("orders")
              .select(`
                *,
                buyer:profiles(*),
                status:order_status(*),
                order_items:order_items(
                  *,
                  product:products(*)
                )
              `)
              .in("order_id", orderIds)
              .order('created_at', { ascending: false });
              
            if (ordersError) throw ordersError;
            setOrders(ordersData as OrderWithDetails[] || []);
          } else {
            setOrders([]);
          }
        } else {
          setOrders([]);
        }
      } else if (profile?.role === "Buyer") {
        // For buyers, just filter by buyer_id
        const { data, error } = await query.eq("buyer_id", profile.id);
        if (error) throw error;
        setOrders(data as OrderWithDetails[] || []);
      } else if (profile?.role === "Admin") {
        // Admins see all orders
        const { data, error } = await query;
        if (error) throw error;
        console.log("Orders page - Admin fetched orders:", data);
        setOrders(data as OrderWithDetails[] || []);
      }
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error fetching orders",
        description: error.message,
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    // Apply status filter
    const orderStatus = getStatusName(order.status) || '';
    const statusMatch = statusFilter === "all" ? true : orderStatus === statusFilter;
    
    // Apply search filter (if implemented)
    const searchMatch = true; // TODO: Implement search functionality
    
    return statusMatch && searchMatch;
  });

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "Processing":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Shipped":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "Delivered":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Cancelled":
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
      <div className="flex items-center">
        <ShoppingCart className="h-6 w-6 mr-2" />
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {profile?.role === "Buyer" 
              ? "Track your order history" 
              : profile?.role === "Farmer" 
                ? "Manage orders for your products"
                : "Manage all orders in the system"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No orders found</h3>
              <p className="mt-1 text-gray-500">
                {profile?.role === "Buyer"
                  ? "You haven't placed any orders yet."
                  : "No orders match your search criteria."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.order_id}>
                      <TableCell>{order.order_id}</TableCell>
                      <TableCell>{order.buyer?.name || 'N/A'}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>${order.total_price || 0}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(getStatusName(order.status))}>
                          {getStatusName(order.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPage;
