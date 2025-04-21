
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
  Star,
  AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ProductWithDetails, OrderWithDetails } from "@/types/database.types";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const BuyerDashboard = () => {
  const { profile } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState<ProductWithDetails[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Map<number, { product: ProductWithDetails, quantity: number }>>(new Map());
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    if (profile) {
      fetchBuyerData();
      // Load cart from local storage
      const savedCart = localStorage.getItem(`cart-${profile.id}`);
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          const cartMap = new Map();
          Object.keys(parsedCart).forEach(key => {
            cartMap.set(parseInt(key), parsedCart[key]);
          });
          setCart(cartMap);
        } catch (error) {
          console.error("Error parsing cart from localStorage:", error);
        }
      }
    }
  }, [profile]);

  // Save cart to local storage whenever it changes
  useEffect(() => {
    if (profile && cart.size > 0) {
      const cartObj: Record<string, any> = {};
      cart.forEach((value, key) => {
        cartObj[key] = value;
      });
      localStorage.setItem(`cart-${profile.id}`, JSON.stringify(cartObj));
    }
  }, [cart, profile]);

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
      
      // Cast the returned data as ProductWithDetails[] since we've updated our type to accept
      // partial farmer and category objects
      setFeaturedProducts(productsData as unknown as ProductWithDetails[]);

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
      setRecentOrders(ordersData as OrderWithDetails[] || []);
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

  const addToCart = (product: ProductWithDetails) => {
    if (!product.stock) {
      toast({
        title: "Product out of stock",
        description: "This product is currently unavailable",
        variant: "destructive",
      });
      return;
    }

    const newCart = new Map(cart);
    const existingItem = newCart.get(product.product_id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        newCart.set(product.product_id, { 
          product, 
          quantity: existingItem.quantity + 1 
        });
        toast({
          title: "Cart updated",
          description: `Added another ${product.name} to your cart`,
        });
      } else {
        toast({
          title: "Maximum stock reached",
          description: `You cannot add more than the available stock (${product.stock})`,
          variant: "destructive",
        });
        return;
      }
    } else {
      newCart.set(product.product_id, { product, quantity: 1 });
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
      });
    }
    
    setCart(newCart);
  };

  const removeFromCart = (productId: number) => {
    const newCart = new Map(cart);
    newCart.delete(productId);
    setCart(newCart);
    
    toast({
      title: "Removed from cart",
      description: "Item has been removed from your cart",
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    const newCart = new Map(cart);
    const item = newCart.get(productId);
    
    if (item) {
      if (quantity <= 0) {
        newCart.delete(productId);
      } else if (quantity <= item.product.stock) {
        newCart.set(productId, { ...item, quantity });
      } else {
        toast({
          title: "Invalid quantity",
          description: `You cannot add more than the available stock (${item.product.stock})`,
          variant: "destructive",
        });
        return;
      }
      
      setCart(newCart);
    }
  };

  const calculateTotal = () => {
    let total = 0;
    cart.forEach(item => {
      total += item.product.price * item.quantity;
    });
    return total.toFixed(2);
  };

  const handleCheckout = async () => {
    if (!profile) {
      toast({
        title: "Authentication required",
        description: "Please log in to checkout",
        variant: "destructive",
      });
      return;
    }

    if (cart.size === 0) {
      toast({
        title: "Empty cart",
        description: "Your cart is empty",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create the order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: profile.id,
          total_price: parseFloat(calculateTotal()),
          status_id: 1 // Assuming 1 is "Processing"
        })
        .select();

      if (orderError) throw orderError;
      
      const order = orderData[0];
      
      // Create order items
      const orderItems = Array.from(cart.values()).map(item => ({
        order_id: order.order_id,
        product_id: item.product.product_id,
        quantity: item.quantity,
        price_per_unit: item.product.price
      }));
      
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);
        
      if (itemsError) throw itemsError;
      
      // Update stock for each product
      for (const item of cart.values()) {
        const newStock = item.product.stock - item.quantity;
        
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("product_id", item.product.product_id);
          
        if (stockError) throw stockError;
      }
      
      // Clear cart
      setCart(new Map());
      localStorage.removeItem(`cart-${profile.id}`);
      
      toast({
        title: "Order placed successfully",
        description: "Thank you for your purchase!",
      });
      
      // Refresh data
      fetchBuyerData();
      setShowCartDialog(false);
      
    } catch (error: any) {
      console.error("Error during checkout:", error);
      toast({
        title: "Checkout failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openReviewDialog = (product: ProductWithDetails) => {
    setSelectedProduct(product);
    setRating(5);
    setReviewComment("");
    setShowReviewDialog(true);
  };

  const submitReview = async () => {
    if (!profile || !selectedProduct) return;
    
    try {
      // Add rating
      const { error: ratingError } = await supabase
        .from("ratings")
        .insert({
          buyer_id: profile.id,
          product_id: selectedProduct.product_id,
          rating: rating
        });
        
      if (ratingError) throw ratingError;
      
      // Add review if comment provided
      if (reviewComment.trim()) {
        const { error: reviewError } = await supabase
          .from("reviews")
          .insert({
            buyer_id: profile.id,
            product_id: selectedProduct.product_id,
            comment: reviewComment.trim()
          });
          
        if (reviewError) throw reviewError;
      }
      
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
      
      setShowReviewDialog(false);
      
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({
        title: "Review submission failed",
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

      {/* Cart button */}
      <div className="flex justify-end">
        <Button 
          onClick={() => setShowCartDialog(true)} 
          className="bg-green-600 hover:bg-green-700"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Cart ({Array.from(cart.values()).reduce((sum, item) => sum + item.quantity, 0)} items)
        </Button>
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
                  
                  {product.stock && product.stock < 10 && (
                    <div className="flex items-center text-amber-600 text-xs mb-2">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      <span>Low stock! Only {product.stock} left</span>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => addToCart(product)}
                      disabled={!product.stock}
                    >
                      Add to Cart
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => openReviewDialog(product)}
                    >
                      Rate
                    </Button>
                  </div>
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

      {/* Cart Dialog */}
      <Dialog open={showCartDialog} onOpenChange={setShowCartDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your Shopping Cart</DialogTitle>
            <DialogDescription>
              Review your items before checkout
            </DialogDescription>
          </DialogHeader>
          
          {cart.size > 0 ? (
            <>
              <div className="space-y-4 max-h-[60vh] overflow-auto">
                {Array.from(cart.entries()).map(([productId, item]) => (
                  <div key={productId} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center mr-4">
                        {item.product.image_url ? (
                          <img 
                            src={item.product.image_url} 
                            alt={item.product.name} 
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{item.product.name}</h3>
                        <p className="text-sm text-gray-500">${item.product.price} each</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateQuantity(productId, item.quantity - 1)}
                        className="h-8 w-8 p-0"
                      >
                        -
                      </Button>
                      <span className="mx-2">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateQuantity(productId, item.quantity + 1)}
                        className="h-8 w-8 p-0"
                      >
                        +
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeFromCart(productId)}
                        className="ml-4 text-red-500"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium">Total:</span>
                  <span className="text-xl font-bold">${calculateTotal()}</span>
                </div>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleCheckout}
                >
                  Checkout
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
              <Button 
                className="mt-4 bg-green-600 hover:bg-green-700"
                onClick={() => setShowCartDialog(false)}
              >
                Continue Shopping
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate & Review</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Your Rating</label>
              <div className="flex items-center mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star}
                    className={`h-8 w-8 cursor-pointer ${
                      star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Your Review (Optional)</label>
              <textarea
                className="w-full mt-2 p-2 border rounded-md"
                rows={4}
                placeholder="Share your experience with this product..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={submitReview}
            >
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerDashboard;
