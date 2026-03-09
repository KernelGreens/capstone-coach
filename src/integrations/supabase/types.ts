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
      capstone_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          display_order: number
          due_date: string | null
          feedback: string | null
          id: string
          proposal_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          due_date?: string | null
          feedback?: string | null
          id?: string
          proposal_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          due_date?: string | null
          feedback?: string | null
          id?: string
          proposal_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capstone_milestones_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "capstone_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      capstone_presentations: {
        Row: {
          created_at: string
          duration_minutes: number
          evaluated_at: string | null
          evaluated_by: string | null
          evaluation_notes: string | null
          evaluation_score: number | null
          id: string
          location: string | null
          meeting_link: string | null
          presentation_notes: string | null
          proposal_id: string
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_notes?: string | null
          evaluation_score?: number | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          presentation_notes?: string | null
          proposal_id: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_notes?: string | null
          evaluation_score?: number | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          presentation_notes?: string | null
          proposal_id?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capstone_presentations_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "capstone_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      capstone_proposals: {
        Row: {
          abstract: string | null
          approved_by: string | null
          created_at: string
          expected_outcomes: string | null
          id: string
          methodology: string | null
          objectives: string | null
          project_id: string | null
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string
          student_id: string
          submitted_at: string | null
          timeline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          abstract?: string | null
          approved_by?: string | null
          created_at?: string
          expected_outcomes?: string | null
          id?: string
          methodology?: string | null
          objectives?: string | null
          project_id?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          student_id: string
          submitted_at?: string | null
          timeline?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          abstract?: string | null
          approved_by?: string | null
          created_at?: string
          expected_outcomes?: string | null
          id?: string
          methodology?: string | null
          objectives?: string | null
          project_id?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          student_id?: string
          submitted_at?: string | null
          timeline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capstone_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capstone_proposals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
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
      company_profiles: {
        Row: {
          company_name: string
          contact_email: string | null
          created_at: string
          description: string | null
          id: string
          industry: string | null
          location: string | null
          logo_url: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_pinned: boolean | null
          title: string | null
          track_id: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string | null
          track_id?: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string | null
          track_id?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
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
      internship_applications: {
        Row: {
          applicant_id: string
          applied_at: string
          cover_letter: string | null
          decided_at: string | null
          id: string
          interviewed_at: string | null
          listing_id: string
          portfolio_url: string | null
          resume_url: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          shortlisted_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          applied_at?: string
          cover_letter?: string | null
          decided_at?: string | null
          id?: string
          interviewed_at?: string | null
          listing_id: string
          portfolio_url?: string | null
          resume_url?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          shortlisted_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          applied_at?: string
          cover_letter?: string | null
          decided_at?: string | null
          id?: string
          interviewed_at?: string | null
          listing_id?: string
          portfolio_url?: string | null
          resume_url?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          shortlisted_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internship_applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "internship_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_listings: {
        Row: {
          application_deadline: string | null
          company_profile_id: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_weeks: number | null
          id: string
          location: string | null
          location_type: string
          max_applicants: number | null
          requirements: string | null
          skills_required: string[] | null
          start_date: string | null
          status: string
          title: string
          track_id: string | null
          updated_at: string
        }
        Insert: {
          application_deadline?: string | null
          company_profile_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          location?: string | null
          location_type?: string
          max_applicants?: number | null
          requirements?: string | null
          skills_required?: string[] | null
          start_date?: string | null
          status?: string
          title: string
          track_id?: string | null
          updated_at?: string
        }
        Update: {
          application_deadline?: string | null
          company_profile_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          location?: string | null
          location_type?: string
          max_applicants?: number | null
          requirements?: string | null
          skills_required?: string[] | null
          start_date?: string | null
          status?: string
          title?: string
          track_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internship_listings_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internship_listings_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          display_order: number
          duration_seconds: number | null
          external_url: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_downloadable: boolean
          lesson_type: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number
          duration_seconds?: number | null
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_downloadable?: boolean
          lesson_type?: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number
          duration_seconds?: number | null
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_downloadable?: boolean
          lesson_type?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_edited: boolean | null
          parent_message_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          parent_message_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          parent_message_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
      office_hour_bookings: {
        Row: {
          booking_date: string
          created_at: string
          id: string
          notes: string | null
          office_hour_id: string
          start_time: string
          status: string
          student_id: string
        }
        Insert: {
          booking_date: string
          created_at?: string
          id?: string
          notes?: string | null
          office_hour_id: string
          start_time: string
          status?: string
          student_id: string
        }
        Update: {
          booking_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          office_hour_id?: string
          start_time?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_hour_bookings_office_hour_id_fkey"
            columns: ["office_hour_id"]
            isOneToOne: false
            referencedRelation: "office_hours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_hour_bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      office_hours: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          slot_duration_minutes: number
          start_time: string
          supervisor_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          slot_duration_minutes?: number
          start_time: string
          supervisor_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          slot_duration_minutes?: number
          start_time?: string
          supervisor_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_projects: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          github_stats: Json | null
          github_url: string | null
          id: string
          image_url: string | null
          portfolio_id: string
          project_id: string | null
          technologies: string[] | null
          title: string
          updated_at: string
          week_number: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          github_stats?: Json | null
          github_url?: string | null
          id?: string
          image_url?: string | null
          portfolio_id: string
          project_id?: string | null
          technologies?: string[] | null
          title: string
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          github_stats?: Json | null
          github_url?: string | null
          id?: string
          image_url?: string | null
          portfolio_id?: string
          project_id?: string | null
          technologies?: string[] | null
          title?: string
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          bio: string | null
          certificate_issued: boolean
          created_at: string
          github_data: Json | null
          github_username: string | null
          graduation_approved: boolean
          graduation_approved_at: string | null
          graduation_approved_by: string | null
          id: string
          is_public: boolean
          share_token: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          certificate_issued?: boolean
          created_at?: string
          github_data?: Json | null
          github_username?: string | null
          graduation_approved?: boolean
          graduation_approved_at?: string | null
          graduation_approved_by?: string | null
          id?: string
          is_public?: boolean
          share_token?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          certificate_issued?: boolean
          created_at?: string
          github_data?: Json | null
          github_username?: string | null
          graduation_approved?: boolean
          graduation_approved_at?: string | null
          graduation_approved_by?: string | null
          id?: string
          is_public?: boolean
          share_token?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          timezone?: string | null
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
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          max_score: number | null
          quiz_id: string
          score: number | null
          started_at: string
          student_id: string
          weekly_progress_id: string | null
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score?: number | null
          quiz_id: string
          score?: number | null
          started_at?: string
          student_id: string
          weekly_progress_id?: string | null
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score?: number | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          student_id?: string
          weekly_progress_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_weekly_progress_id_fkey"
            columns: ["weekly_progress_id"]
            isOneToOne: false
            referencedRelation: "weekly_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          display_order: number
          explanation: string | null
          id: string
          options: Json | null
          points: number
          question_text: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          display_order?: number
          explanation?: string | null
          id?: string
          options?: Json | null
          points?: number
          question_text: string
          question_type?: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          display_order?: number
          explanation?: string | null
          id?: string
          options?: Json | null
          points?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_ai_generated: boolean
          is_published: boolean
          quiz_type: string
          time_limit_minutes: number | null
          title: string
          track_id: string | null
          updated_at: string
          week_number: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_ai_generated?: boolean
          is_published?: boolean
          quiz_type?: string
          time_limit_minutes?: number | null
          title: string
          track_id?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_ai_generated?: boolean
          is_published?: boolean
          quiz_type?: string
          time_limit_minutes?: number | null
          title?: string
          track_id?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
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
      skill_badges: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          category: string
          description: string | null
          id: string
          level: string
          name: string
          portfolio_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          category?: string
          description?: string | null
          id?: string
          level?: string
          name: string
          portfolio_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          category?: string
          description?: string | null
          id?: string
          level?: string
          name?: string
          portfolio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_badges_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
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
          learning_hours: number | null
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
          learning_hours?: number | null
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
          learning_hours?: number | null
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
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "supervisor" | "student" | "company"
      conversation_type: "direct" | "group" | "announcement" | "question_thread"
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
      app_role: ["supervisor", "student", "company"],
      conversation_type: ["direct", "group", "announcement", "question_thread"],
    },
  },
} as const
