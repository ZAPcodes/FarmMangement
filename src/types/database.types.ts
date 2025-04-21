
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

export type ProductWithDetails = Product & {
  category?: Category;
  farmer?: Profile;
  avgRating?: number;
};

export type OrderWithDetails = Order & {
  items?: (OrderItem & { product?: Product })[];
  status?: OrderStatus;
  buyer?: Profile;
};

export type UserRole = Database["public"]["Enums"]["user_role"];
export type ProductStatus = Database["public"]["Enums"]["product_status"];
