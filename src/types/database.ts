export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DisputeStatus =
  | "open"
  | "in_progress"
  | "mediation"
  | "resolved"
  | "closed";

export type ResolutionStatus = "proposed" | "accepted" | "rejected";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
        };
      };
      disputes: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: DisputeStatus;
          creator_id: string;
          opponent_id: string | null;
          invite_code: string;
          max_rounds: number;
          is_public: boolean;
          early_end_proposed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          status?: DisputeStatus;
          creator_id: string;
          opponent_id?: string | null;
          invite_code?: string;
          max_rounds?: number;
          is_public?: boolean;
          early_end_proposed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: DisputeStatus;
          creator_id?: string;
          opponent_id?: string | null;
          invite_code?: string;
          max_rounds?: number;
          is_public?: boolean;
          early_end_proposed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      arguments: {
        Row: {
          id: string;
          dispute_id: string;
          author_id: string;
          round: number;
          position: string;
          reasoning: string;
          evidence: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          dispute_id: string;
          author_id: string;
          round: number;
          position: string;
          reasoning: string;
          evidence?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          dispute_id?: string;
          author_id?: string;
          round?: number;
          position?: string;
          reasoning?: string;
          evidence?: string | null;
          created_at?: string;
        };
      };
      mediations: {
        Row: {
          id: string;
          dispute_id: string;
          analysis: Json;
          solutions: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          dispute_id: string;
          analysis: Json;
          solutions: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          dispute_id?: string;
          analysis?: Json;
          solutions?: Json;
          created_at?: string;
        };
      };
      dispute_analysis: {
        Row: {
          id: string;
          dispute_id: string;
          plane: string;
          tone_level: number;
          heat_level: number;
          core_tension: string | null;
          plane_prompt: string | null;
          patterns: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          dispute_id: string;
          plane?: string;
          tone_level?: number;
          heat_level?: number;
          core_tension?: string | null;
          plane_prompt?: string | null;
          patterns?: Json;
          created_at?: string;
        };
        Update: {
          plane?: string;
          tone_level?: number;
          heat_level?: number;
          core_tension?: string | null;
          plane_prompt?: string | null;
          patterns?: Json;
        };
      };
      round_insights: {
        Row: {
          id: string;
          dispute_id: string;
          round: number;
          recipient_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          dispute_id: string;
          round: number;
          recipient_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      resolutions: {
        Row: {
          id: string;
          dispute_id: string;
          chosen_solution: number;
          accepted_by: string[];
          status: ResolutionStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          dispute_id: string;
          chosen_solution: number;
          accepted_by?: string[];
          status?: ResolutionStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          dispute_id?: string;
          chosen_solution?: number;
          accepted_by?: string[];
          status?: ResolutionStatus;
          created_at?: string;
        };
      };
      user_points: {
        Row: {
          user_id: string;
          total: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          total?: number;
          updated_at?: string;
        };
      };
      waiting_insights: {
        Row: {
          id: string;
          dispute_id: string;
          round: number;
          recipient_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          dispute_id: string;
          round: number;
          recipient_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          earned_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      dispute_status: DisputeStatus;
      resolution_status: ResolutionStatus;
    };
  };
}
