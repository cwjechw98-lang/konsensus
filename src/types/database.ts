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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      dispute_status: DisputeStatus;
      resolution_status: ResolutionStatus;
    };
  };
}
