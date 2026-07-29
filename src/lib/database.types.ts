export type StaffRole = "admin" | "manager" | "sales" | "inventory";
export type CustomerType = "individual" | "business" | "wholesale";
export type OrderStatus =
  | "draft"
  | "quotation"
  | "approved"
  | "order"
  | "completed"
  | "cancelled";
export type InventoryMovementType =
  | "stock_in"
  | "stock_out"
  | "transfer"
  | "adjustment";
export type NotificationType =
  | "low_stock"
  | "new_order"
  | "new_customer"
  | "order_completed"
  | "general";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          name: string;
          slug: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          country: string | null;
          currency: string;
          tax_rate: number;
          logo_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          currency?: string;
          tax_rate?: number;
          logo_url?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>;
        Relationships: [];
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: StaffRole;
          branch_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role?: StaffRole;
          branch_id?: string | null;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["business_members"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      branches: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          code: string | null;
          address: string | null;
          phone: string | null;
          is_main: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          code?: string | null;
          address?: string | null;
          phone?: string | null;
          is_main?: boolean;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["branches"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          description?: string | null;
          parent_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          description?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["brands"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          sku: string | null;
          barcode: string | null;
          category_id: string | null;
          brand_id: string | null;
          description: string | null;
          image_url: string | null;
          cost_price: number;
          selling_price: number;
          tax_rate: number | null;
          stock_quantity: number;
          reorder_level: number;
          unit: string;
          has_variants: boolean;
          track_batch: boolean;
          track_expiry: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          sku?: string | null;
          barcode?: string | null;
          category_id?: string | null;
          brand_id?: string | null;
          description?: string | null;
          image_url?: string | null;
          cost_price?: number;
          selling_price?: number;
          tax_rate?: number | null;
          stock_quantity?: number;
          reorder_level?: number;
          unit?: string;
          has_variants?: boolean;
          track_batch?: boolean;
          track_expiry?: boolean;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          business_id: string;
          name: string;
          sku: string | null;
          barcode: string | null;
          colour: string | null;
          size: string | null;
          cost_price: number | null;
          selling_price: number | null;
          stock_quantity: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          business_id: string;
          name: string;
          sku?: string | null;
          barcode?: string | null;
          colour?: string | null;
          size?: string | null;
          cost_price?: number | null;
          selling_price?: number | null;
          stock_quantity?: number;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["product_variants"]["Insert"]
        >;
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          id: string;
          business_id: string;
          product_id: string;
          variant_id: string | null;
          branch_id: string | null;
          to_branch_id: string | null;
          movement_type: InventoryMovementType;
          quantity: number;
          batch_number: string | null;
          expiry_date: string | null;
          notes: string | null;
          reference_type: string | null;
          reference_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          product_id: string;
          variant_id?: string | null;
          branch_id?: string | null;
          to_branch_id?: string | null;
          movement_type: InventoryMovementType;
          quantity: number;
          batch_number?: string | null;
          expiry_date?: string | null;
          notes?: string | null;
          reference_type?: string | null;
          reference_id?: string | null;
          created_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["inventory_movements"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          company: string | null;
          customer_type: CustomerType;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          company?: string | null;
          customer_type?: CustomerType;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          customer_id: string | null;
          order_number: string;
          status: OrderStatus;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total: number;
          notes: string | null;
          quotation_date: string | null;
          order_date: string | null;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id?: string | null;
          customer_id?: string | null;
          order_number: string;
          status?: OrderStatus;
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total?: number;
          notes?: string | null;
          quotation_date?: string | null;
          order_date?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          business_id: string;
          product_id: string | null;
          variant_id: string | null;
          product_name: string;
          sku: string | null;
          quantity: number;
          unit_price: number;
          tax_rate: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          business_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name: string;
          sku?: string | null;
          quantity?: number;
          unit_price?: number;
          tax_rate?: number;
          line_total?: number;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          business_id: string;
          user_id: string | null;
          type: NotificationType;
          title: string;
          body: string | null;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string | null;
          type?: NotificationType;
          title: string;
          body?: string | null;
          link?: string | null;
          is_read?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          business_id: string;
          user_id: string | null;
          entity_type: string;
          entity_id: string | null;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string | null;
          entity_type: string;
          entity_id?: string | null;
          action: string;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["activity_logs"]["Insert"]>;
        Relationships: [];
      };
    };
    Functions: {
      create_business: {
        Args: { p_name: string; p_slug: string; p_currency?: string };
        Returns: Database["public"]["Tables"]["businesses"]["Row"];
      };
      next_order_number: {
        Args: { p_business_id: string };
        Returns: string;
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
