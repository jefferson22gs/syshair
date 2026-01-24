export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          client_birthday: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          coupon_id: string | null
          created_at: string
          date: string
          discount: number | null
          end_time: string
          final_price: number
          id: string
          notes: string | null
          price: number
          professional_id: string
          salon_id: string
          service_id: string
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          client_birthday?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          coupon_id?: string | null
          created_at?: string
          date: string
          discount?: number | null
          end_time: string
          final_price: number
          id?: string
          notes?: string | null
          price: number
          professional_id: string
          salon_id: string
          service_id: string
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          client_birthday?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          coupon_id?: string | null
          created_at?: string
          date?: string
          discount?: number | null
          end_time?: string
          final_price?: number
          id?: string
          notes?: string | null
          price?: number
          professional_id?: string
          salon_id?: string
          service_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_credits: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string | null
          id: string
          package_id: string | null
          remaining_uses: number
          salon_id: string
          service_id: string
          total_uses: number
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          package_id?: string | null
          remaining_uses?: number
          salon_id: string
          service_id: string
          total_uses?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          package_id?: string | null
          remaining_uses?: number
          salon_id?: string
          service_id?: string
          total_uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_credits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_gallery: {
        Row: {
          after_image_url: string | null
          appointment_id: string | null
          before_image_url: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          professional_id: string | null
          salon_id: string
          service_id: string | null
          share_token: string | null
          visibility: string | null
        }
        Insert: {
          after_image_url?: string | null
          appointment_id?: string | null
          before_image_url?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          professional_id?: string | null
          salon_id: string
          service_id?: string | null
          share_token?: string | null
          visibility?: string | null
        }
        Update: {
          after_image_url?: string | null
          appointment_id?: string | null
          before_image_url?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          professional_id?: string | null
          salon_id?: string
          service_id?: string | null
          share_token?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_gallery_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_gallery_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_gallery_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_gallery_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_gallery_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_metrics: {
        Row: {
          avg_days_between_visits: number | null
          churn_risk: string | null
          client_id: string
          id: string
          last_visit_date: string | null
          ltv: number | null
          predicted_next_visit: string | null
          preferred_day_of_week: number | null
          preferred_professional_id: string | null
          preferred_time: string | null
          salon_id: string
          total_appointments: number | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          avg_days_between_visits?: number | null
          churn_risk?: string | null
          client_id: string
          id?: string
          last_visit_date?: string | null
          ltv?: number | null
          predicted_next_visit?: string | null
          preferred_day_of_week?: number | null
          preferred_professional_id?: string | null
          preferred_time?: string | null
          salon_id: string
          total_appointments?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          avg_days_between_visits?: number | null
          churn_risk?: string | null
          client_id?: string
          id?: string
          last_visit_date?: string | null
          ltv?: number | null
          predicted_next_visit?: string | null
          preferred_day_of_week?: number | null
          preferred_professional_id?: string | null
          preferred_time?: string | null
          salon_id?: string
          total_appointments?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_metrics_preferred_professional_id_fkey"
            columns: ["preferred_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_metrics_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_visit_at: string | null
          loyalty_points: number
          name: string
          notes: string | null
          phone: string | null
          preferences: Json | null
          salon_id: string
          total_spent: number | null
          total_visits: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_visit_at?: string | null
          loyalty_points?: number
          name: string
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          salon_id: string
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_visit_at?: string | null
          loyalty_points?: number
          name?: string
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          salon_id?: string
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          is_new_clients_only: boolean | null
          max_uses: number | null
          min_purchase: number | null
          salon_id: string
          type: Database["public"]["Enums"]["coupon_type"]
          uses_count: number | null
          valid_from: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_new_clients_only?: boolean | null
          max_uses?: number | null
          min_purchase?: number | null
          salon_id: string
          type?: Database["public"]["Enums"]["coupon_type"]
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_new_clients_only?: boolean | null
          max_uses?: number | null
          min_purchase?: number | null
          salon_id?: string
          type?: Database["public"]["Enums"]["coupon_type"]
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          channel: string
          client_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          phone: string | null
          salon_id: string
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          title: string | null
          type: string
        }
        Insert: {
          appointment_id?: string | null
          channel: string
          client_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          phone?: string | null
          salon_id: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string | null
          type: string
        }
        Update: {
          appointment_id?: string | null
          channel?: string
          client_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          phone?: string | null
          salon_id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          client_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          package_id: string | null
          paid_at: string | null
          payment_method: string
          payment_status: string
          payment_type: string
          salon_id: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          package_id?: string | null
          paid_at?: string | null
          payment_method: string
          payment_status?: string
          payment_type?: string
          salon_id: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          package_id?: string | null
          paid_at?: string | null
          payment_method?: string
          payment_status?: string
          payment_type?: string
          salon_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sales: {
        Row: {
          appointment_id: string | null
          client_id: string | null
          created_at: string
          id: string
          product_id: string
          quantity: number
          salon_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          salon_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          salon_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sales_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          salon_id: string
          stock: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          salon_id: string
          stock?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          salon_id?: string
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_services: {
        Row: {
          custom_duration: number | null
          custom_price: number | null
          id: string
          professional_id: string
          service_id: string
        }
        Insert: {
          custom_duration?: number | null
          custom_price?: number | null
          id?: string
          professional_id: string
          service_id: string
        }
        Update: {
          custom_duration?: number | null
          custom_price?: number | null
          id?: string
          professional_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          avatar_url: string | null
          bio: string | null
          commission_rate: number | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          is_autonomous: boolean | null
          name: string
          phone: string | null
          portfolio_urls: Json | null
          public_profile_enabled: boolean | null
          salon_id: string
          specialty: string | null
          updated_at: string
          user_id: string | null
          working_days: number[] | null
          working_hours: Json | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          commission_rate?: number | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_autonomous?: boolean | null
          name: string
          phone?: string | null
          portfolio_urls?: Json | null
          public_profile_enabled?: boolean | null
          salon_id: string
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
          working_days?: number[] | null
          working_hours?: Json | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          commission_rate?: number | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_autonomous?: boolean | null
          name?: string
          phone?: string | null
          portfolio_urls?: Json | null
          public_profile_enabled?: boolean | null
          salon_id?: string
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
          working_days?: number[] | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          client_id: string | null
          created_at: string
          device_info: Json | null
          endpoint: string
          id: string
          is_active: boolean | null
          p256dh: string
          salon_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth: string
          client_id?: string | null
          created_at?: string
          device_info?: Json | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          p256dh: string
          salon_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          client_id?: string | null
          created_at?: string
          device_info?: Json | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          p256dh?: string
          salon_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string | null
          client_id: string
          comment: string | null
          created_at: string
          id: string
          is_public: boolean | null
          professional_id: string
          rating: number
          response: string | null
          response_at: string | null
          salon_id: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          professional_id: string
          rating: number
          response?: string | null
          response_at?: string | null
          salon_id: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          professional_id?: string
          rating?: number
          response?: string | null
          response_at?: string | null
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_groups: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          primary_color: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          primary_color?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          primary_color?: string | null
        }
        Relationships: []
      }
      salon_insights: {
        Row: {
          action_data: Json | null
          action_type: string | null
          created_at: string
          expires_at: string | null
          id: string
          insight_type: string
          is_dismissed: boolean | null
          is_read: boolean | null
          message: string
          priority: string | null
          salon_id: string
          title: string
        }
        Insert: {
          action_data?: Json | null
          action_type?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          insight_type: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message: string
          priority?: string | null
          salon_id: string
          title: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message?: string
          priority?: string | null
          salon_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_insights_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_plans: {
        Row: {
          created_at: string
          custom_domain: string | null
          expires_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_professionals: number | null
          max_services: number | null
          plan_type: string
          price_monthly: number | null
          salon_id: string
          started_at: string | null
          white_label_enabled: boolean | null
        }
        Insert: {
          created_at?: string
          custom_domain?: string | null
          expires_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_professionals?: number | null
          max_services?: number | null
          plan_type?: string
          price_monthly?: number | null
          salon_id: string
          started_at?: string | null
          white_label_enabled?: boolean | null
        }
        Update: {
          created_at?: string
          custom_domain?: string | null
          expires_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_professionals?: number | null
          max_services?: number | null
          plan_type?: string
          price_monthly?: number | null
          salon_id?: string
          started_at?: string | null
          white_label_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "salon_plans_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          address: string | null
          business_name: string | null
          city: string | null
          closing_time: string | null
          cnpj: string | null
          created_at: string
          description: string | null
          email: string | null
          group_id: string | null
          id: string
          is_active: boolean | null
          is_franchise: boolean | null
          logo_url: string | null
          name: string
          opening_time: string | null
          owner_id: string
          phone: string | null
          primary_color: string | null
          public_booking_enabled: boolean | null
          slug: string | null
          state: string | null
          updated_at: string
          whatsapp: string | null
          working_days: number[] | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          closing_time?: string | null
          cnpj?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          is_franchise?: boolean | null
          logo_url?: string | null
          name: string
          opening_time?: string | null
          owner_id: string
          phone?: string | null
          primary_color?: string | null
          public_booking_enabled?: boolean | null
          slug?: string | null
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
          working_days?: number[] | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          closing_time?: string | null
          cnpj?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          is_franchise?: boolean | null
          logo_url?: string | null
          name?: string
          opening_time?: string | null
          owner_id?: string
          phone?: string | null
          primary_color?: string | null
          public_booking_enabled?: boolean | null
          slug?: string | null
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
          working_days?: number[] | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "salon_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          created_at: string
          description: string | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          quantity: number
          salon_id: string
          service_id: string
          validity_days: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          quantity?: number
          salon_id: string
          service_id: string
          validity_days?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          quantity?: number
          salon_id?: string
          service_id?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          salon_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          salon_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          mp_payment_id: string | null
          mp_status: string | null
          mp_status_detail: string | null
          paid_at: string | null
          payment_method: string | null
          salon_id: string | null
          subscription_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_status?: string | null
          mp_status_detail?: string | null
          paid_at?: string | null
          payment_method?: string | null
          salon_id?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_status?: string | null
          mp_status_detail?: string | null
          paid_at?: string | null
          payment_method?: string | null
          salon_id?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_trial: boolean | null
          last_payment_date: string | null
          mp_external_reference: string | null
          mp_payer_id: string | null
          mp_preapproval_id: string | null
          next_payment_date: string | null
          plan_id: string | null
          plan_name: string | null
          salon_id: string | null
          status: string
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_trial?: boolean | null
          last_payment_date?: string | null
          mp_external_reference?: string | null
          mp_payer_id?: string | null
          mp_preapproval_id?: string | null
          next_payment_date?: string | null
          plan_id?: string | null
          plan_name?: string | null
          salon_id?: string | null
          status?: string
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_trial?: boolean | null
          last_payment_date?: string | null
          mp_external_reference?: string | null
          mp_payer_id?: string | null
          mp_preapproval_id?: string | null
          next_payment_date?: string | null
          plan_id?: string | null
          plan_name?: string | null
          salon_id?: string | null
          status?: string
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          salon_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          salon_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          salon_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_client_metrics: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      check_birthday_notifications: { Args: never; Returns: undefined }
      generate_salon_insights: {
        Args: { p_salon_id: string }
        Returns: undefined
      }
      get_salon_analytics: {
        Args: { p_period?: string; p_salon_id: string }
        Returns: Json
      }
      get_subscription_status: { Args: { p_salon_id: string }; Returns: Json }
      get_user_salon_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_subscription_active: { Args: { p_salon_id: string }; Returns: boolean }
    }
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      coupon_type: "percentage" | "fixed"
      user_role: "admin" | "professional" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      coupon_type: ["percentage", "fixed"],
      user_role: ["admin", "professional", "client"],
    },
  },
} as const
