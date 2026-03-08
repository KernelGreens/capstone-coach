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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          student_id: string
          updated_at: string
          weekly_progress_id: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          student_id: string
          updated_at?: string
          weekly_progress_id?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          student_id?: string
          updated_at?: string
          weekly_progress_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_weekly_progress_id_fkey"
            columns: ["weekly_progress_id"]
            isOneToOne: false
            referencedRelation: "weekly_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          student_id: string
          uploaded_at: string
          weekly_progress_id: string | null
        }
        Insert: {
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          student_id: string
          uploaded_at?: string
          weekly_progress_id?: string | null
        }
        Update: {
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          student_id?: string
          uploaded_at?: string
          weekly_progress_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_weekly_progress_id_fkey"
            columns: ["weekly_progress_id"]
            isOneToOne: false
            referencedRelation: "weekly_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_criteria: {
        Row: {
          category: string
          created_at: string
          created_by: string
          criterion: string
          id: string
          max_score: number
          track_id: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          criterion: string
          id?: string
          max_score?: number
          track_id?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          criterion?: string
          id?: string
          max_score?: number
          track_id?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          user_email: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          user_email: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          location: string | null
          meeting_link: string | null
          notes: string | null
          scheduled_at: string
          status: string
          student_id: string
          supervisor_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string
          student_id: string
          supervisor_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string
          student_id?: string
          supervisor_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          deliverables: string | null
          description: string | null
          id: string
          objectives: string | null
          project_type: string
          title: string
          tools_technologies: string | null
          track_id: string
          updated_at: string
          week_number: number | null
        }
        Insert: {
          created_at?: string
          deliverables?: string | null
          description?: string | null
          id?: string
          objectives?: string | null
          project_type: string
          title: string
          tools_technologies?: string | null
          track_id: string
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          created_at?: string
          deliverables?: string | null
          description?: string | null
          id?: string
          objectives?: string | null
          project_type?: string
          title?: string
          tools_technologies?: string | null
          track_id?: string
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          file_path: string | null
          id: string
          resource_type: string
          title: string
          track_id: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          file_path?: string | null
          id?: string
          resource_type: string
          title: string
          track_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          file_path?: string | null
          id?: string
          resource_type?: string
          title?: string
          track_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      student_tracks: {
        Row: {
          created_at: string
          id: string
          student_id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_tracks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: string
          supervisor_id: string | null
          track_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          status?: string
          supervisor_id?: string | null
          track_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          supervisor_id?: string | null
          track_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
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
      webauthn_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_evaluations: {
        Row: {
          created_at: string
          criterion_id: string
          id: string
          notes: string | null
          score: number
          updated_at: string
          weekly_progress_id: string
        }
        Insert: {
          created_at?: string
          criterion_id: string
          id?: string
          notes?: string | null
          score?: number
          updated_at?: string
          weekly_progress_id: string
        }
        Update: {
          created_at?: string
          criterion_id?: string
          id?: string
          notes?: string | null
          score?: number
          updated_at?: string
          weekly_progress_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_evaluations_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_evaluations_weekly_progress_id_fkey"
            columns: ["weekly_progress_id"]
            isOneToOne: false
            referencedRelation: "weekly_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_progress: {
        Row: {
          created_at: string
          deliverables_submitted: boolean | null
          id: string
          project_id: string | null
          score_approved: boolean | null
          score_approved_at: string | null
          self_assessment_notes: string | null
          self_assessment_score: number | null
          status: string
          student_id: string
          supervisor_notes: string | null
          supervisor_score: number | null
          tasks: string | null
          updated_at: string
          week_focus: string | null
          week_number: number
        }
        Insert: {
          created_at?: string
          deliverables_submitted?: boolean | null
          id?: string
          project_id?: string | null
          score_approved?: boolean | null
          score_approved_at?: string | null
          self_assessment_notes?: string | null
          self_assessment_score?: number | null
          status?: string
          student_id: string
          supervisor_notes?: string | null
          supervisor_score?: number | null
          tasks?: string | null
          updated_at?: string
          week_focus?: string | null
          week_number: number
        }
        Update: {
          created_at?: string
          deliverables_submitted?: boolean | null
          id?: string
          project_id?: string | null
          score_approved?: boolean | null
          score_approved_at?: string | null
          self_assessment_notes?: string | null
          self_assessment_score?: number | null
          status?: string
          student_id?: string
          supervisor_notes?: string | null
          supervisor_score?: number | null
          tasks?: string | null
          updated_at?: string
          week_focus?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_progress_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_resources: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          resource_type: string
          title: string
          track_id: string
          updated_at: string
          url: string | null
          week_number: number
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          resource_type?: string
          title: string
          track_id: string
          updated_at?: string
          url?: string | null
          week_number: number
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          resource_type?: string
          title?: string
          track_id?: string
          updated_at?: string
          url?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_resources_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "supervisor" | "student"
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
      app_role: ["supervisor", "student"],
    },
  },
} as const
