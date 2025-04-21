export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          category_id: number
          description: string | null
          name: string
        }
        Insert: {
          category_id?: number
          description?: string | null
          name: string
        }
        Update: {
          category_id?: number
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      log_activity: {
        Row: {
          action: string
          created_at: string
          details: string | null
          log_id: number
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          log_id?: number
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          log_id?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          item_id: number
          order_id: number | null
          price_per_unit: number
          product_id: number | null
          quantity: number
        }
        Insert: {
          item_id?: number
          order_id?: number | null
          price_per_unit: number
          product_id?: number | null
          quantity: number
        }
        Update: {
          item_id?: number
          order_id?: number | null
          price_per_unit?: number
          product_id?: number | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      order_status: {
        Row: {
          description: string | null
          name: string
          status_id: number
        }
        Insert: {
          description?: string | null
          name: string
          status_id?: number
        }
        Update: {
          description?: string | null
          name?: string
          status_id?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          buyer_id: string | null
          created_at: string
          order_id: number
          status_id: number | null
          total_price: number
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          order_id?: number
          status_id?: number | null
          total_price: number
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          order_id?: number
          status_id?: number | null
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "order_status"
            referencedColumns: ["status_id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: number | null
          created_at: string
          description: string | null
          farmer_id: string | null
          image_url: string | null
          name: string
          price: number
          product_id: number
          status: Database["public"]["Enums"]["product_status"] | null
          stock: number
        }
        Insert: {
          category_id?: number | null
          created_at?: string
          description?: string | null
          farmer_id?: string | null
          image_url?: string | null
          name: string
          price: number
          product_id?: number
          status?: Database["public"]["Enums"]["product_status"] | null
          stock: number
        }
        Update: {
          category_id?: number | null
          created_at?: string
          description?: string | null
          farmer_id?: string | null
          image_url?: string | null
          name?: string
          price?: number
          product_id?: number
          status?: Database["public"]["Enums"]["product_status"] | null
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "products_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      ratings: {
        Row: {
          buyer_id: string | null
          created_at: string
          product_id: number | null
          rating: number
          rating_id: number
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          product_id?: number | null
          rating: number
          rating_id?: number
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          product_id?: number | null
          rating?: number
          rating_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      reviews: {
        Row: {
          buyer_id: string | null
          comment: string | null
          created_at: string
          product_id: number | null
          review_id: number
        }
        Insert: {
          buyer_id?: string | null
          comment?: string | null
          created_at?: string
          product_id?: number | null
          review_id?: number
        }
        Update: {
          buyer_id?: string | null
          comment?: string | null
          created_at?: string
          product_id?: number | null
          review_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      product_status: "Approved" | "Pending" | "Rejected"
      user_role: "Farmer" | "Buyer" | "Admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      product_status: ["Approved", "Pending", "Rejected"],
      user_role: ["Farmer", "Buyer", "Admin"],
    },
  },
} as const
