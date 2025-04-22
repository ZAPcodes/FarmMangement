import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
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
import { useToast } from "@/components/ui/use-toast";
import { ProductWithDetails } from "@/types/database.types";

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

const FarmerDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [productFilter, setProductFilter] = useState("all");
  const [totalSales, setTotalSales] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    if (profile?.id) {
      fetchData();

      // Subscribe to real-time updates for farmer_sales
      const farmerSalesSubscription = supabase
        .channel('farmer_sales_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'farmer_sales',
            filter: `farmer_id=eq.${profile.id}`
          },
          async () => {
            // Refetch sales data when changes occur
            await fetchSalesData();
          }
        )
        .subscribe();

      return () => {
        farmerSalesSubscription.unsubscribe();
      };
    }
  }, [profile?.id]);

  const fetchSalesData = async () => {
    if (!profile?.id) return;

    try {
      const { data: salesData, error: salesError } = await supabase
        .from('farmer_sales')
        .select('total_amount')
        .eq('farmer_id', profile.id)
        .single();

      if (salesError) throw salesError;

      setTotalSales(salesData?.total_amount || 0);
    } catch (error: any) {
      console.error('Error fetching sales data:', error);
      toast({
        title: 'Error fetching sales data',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchData = async () => {
    if (!profile?.id) return;

    setIsLoading(true);
    try {
      // Fetch all products for this farmer
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(*),
          farmer:profiles(id, name)
        `)
        .eq('farmer_id', profile.id)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      setProducts(productsData || []);
      setTotalProducts(productsData?.length || 0);

      // Calculate pending approvals
      const pendingCount = productsData?.filter(product => product.status === "Pending").length || 0;
      setPendingApprovals(pendingCount);

      // Fetch sales data
      await fetchSalesData();

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

  const filteredProducts = products.filter(product => {
    if (productFilter === "all") return true;
    return product.status === productFilter;
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
          Farmer Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your products and monitor your sales performance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Products</CardTitle>
            <CardDescription>Your listed products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Product Management</CardTitle>
            <CardDescription>
              Manage your product listings and inventory
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
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.product_id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category?.name || "N/A"}</TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{product.status}</Badge>
                    </TableCell>
                    <TableCell>{product.avgRating || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerDashboard;
