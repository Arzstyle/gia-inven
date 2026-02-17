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
      barang: {
        Row: {
          created_at: string
          id: string
          kategori_id: string | null
          kode: string
          nama: string
          satuan: string
          stok: number
          stok_minimum: number
          subkategori_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kategori_id?: string | null
          kode: string
          nama: string
          satuan?: string
          stok?: number
          stok_minimum?: number
          subkategori_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kategori_id?: string | null
          kode?: string
          nama?: string
          satuan?: string
          stok?: number
          stok_minimum?: number
          subkategori_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barang_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "kategori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barang_subkategori_id_fkey"
            columns: ["subkategori_id"]
            isOneToOne: false
            referencedRelation: "subkategori"
            referencedColumns: ["id"]
          },
        ]
      }
      kategori: {
        Row: {
          created_at: string
          deskripsi: string | null
          id: string
          nama: string
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          id?: string
          nama: string
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          id?: string
          nama?: string
        }
        Relationships: []
      }
      log_aktivitas: {
        Row: {
          aksi: string
          created_at: string
          detail: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          aksi: string
          created_at?: string
          detail?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          aksi?: string
          created_at?: string
          detail?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stok_keluar: {
        Row: {
          barang_id: string
          created_at: string
          id: string
          jumlah: number
          keterangan: string | null
          tanggal: string
          user_id: string
        }
        Insert: {
          barang_id: string
          created_at?: string
          id?: string
          jumlah: number
          keterangan?: string | null
          tanggal?: string
          user_id: string
        }
        Update: {
          barang_id?: string
          created_at?: string
          id?: string
          jumlah?: number
          keterangan?: string | null
          tanggal?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stok_keluar_barang_id_fkey"
            columns: ["barang_id"]
            isOneToOne: false
            referencedRelation: "barang"
            referencedColumns: ["id"]
          },
        ]
      }
      stok_masuk: {
        Row: {
          barang_id: string
          created_at: string
          id: string
          jumlah: number
          keterangan: string | null
          supplier_id: string | null
          tanggal: string
          user_id: string
        }
        Insert: {
          barang_id: string
          created_at?: string
          id?: string
          jumlah: number
          keterangan?: string | null
          supplier_id?: string | null
          tanggal?: string
          user_id: string
        }
        Update: {
          barang_id?: string
          created_at?: string
          id?: string
          jumlah?: number
          keterangan?: string | null
          supplier_id?: string | null
          tanggal?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stok_masuk_barang_id_fkey"
            columns: ["barang_id"]
            isOneToOne: false
            referencedRelation: "barang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stok_masuk_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier"
            referencedColumns: ["id"]
          },
        ]
      }
      subkategori: {
        Row: {
          created_at: string
          id: string
          kategori_id: string
          nama: string
        }
        Insert: {
          created_at?: string
          id?: string
          kategori_id: string
          nama: string
        }
        Update: {
          created_at?: string
          id?: string
          kategori_id?: string
          nama?: string
        }
        Relationships: [
          {
            foreignKeyName: "subkategori_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "kategori"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier: {
        Row: {
          alamat: string | null
          created_at: string
          id: string
          kontak: string | null
          nama: string
        }
        Insert: {
          alamat?: string | null
          created_at?: string
          id?: string
          kontak?: string | null
          nama: string
        }
        Update: {
          alamat?: string | null
          created_at?: string
          id?: string
          kontak?: string | null
          nama?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "kasir"
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
      app_role: ["admin", "kasir"],
    },
  },
} as const
