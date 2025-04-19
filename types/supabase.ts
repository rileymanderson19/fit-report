export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          trainer_id: string
          trainerize_id: number
          first_name: string
          last_name: string
          email: string
          created_at: string
          updated_at: string
          active: boolean
        }
        Insert: {
          id?: string
          trainer_id: string
          trainerize_id: number
          first_name: string
          last_name: string
          email: string
          created_at?: string
          updated_at?: string
          active?: boolean
        }
        Update: {
          id?: string
          trainer_id?: string
          trainerize_id?: number
          first_name?: string
          last_name?: string
          email?: string
          created_at?: string
          updated_at?: string
          active?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 