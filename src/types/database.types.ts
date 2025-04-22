import { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderStatus = Database["public"]["Tables"]["order_status"]["Row"];
export type Rating = Database["public"]["Tables"]["ratings"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type LogActivity = Database["public"]["Tables"]["log_activity"]["Row"];
export type FarmerSales = Database["public"]["Tables"]["farmer_sales"]["Row"];

export type ProductStatus = Database["public"]["Enums"]["product_status"];
export type UserRole = Database["public"]["Enums"]["user_role"];

// This is the key issue - the structure of farmer and category
// from the Supabase join doesn't match our expected types
export type ProductWithDetails = Product & {
  category?: Partial<Category>;
  farmer?: Partial<Profile>;
  avgRating?: number;
};

export type OrderWithDetails = Order & {
  buyer?: Partial<Profile>;
  // Use a more specific type for status that supports both string and object representation
  status?: Partial<OrderStatus> | string;
  
  // These fields might be returned from some queries but not others
  // so we make them optional
  product?: Partial<Product>;
  total_amount?: number;
};

export type Tables = {
  categories: Category;
  profiles: Profile;
  products: Product;
  orders: Order;
  order_items: OrderItem;
  order_status: OrderStatus;
  ratings: Rating;
  reviews: Review;
  log_activity: LogActivity;
  farmer_sales: FarmerSales;
};
