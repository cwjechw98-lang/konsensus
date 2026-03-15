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

export type ChallengeStatus = "open" | "active" | "closed";

export type ResolutionStatus = "proposed" | "accepted" | "rejected";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          bio: string | null;
          debate_stance: string | null;
          created_at: string;
          telegram_chat_id: number | null;
          telegram_link_token: string | null;
          telegram_bot_messages: number[] | null;
          telegram_message_index: Json | null;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          bio?: string | null;
          debate_stance?: string | null;
          created_at?: string;
          telegram_chat_id?: number | null;
          telegram_link_token?: string | null;
          telegram_bot_messages?: number[] | null;
          telegram_message_index?: Json | null;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          bio?: string | null;
          debate_stance?: string | null;
          created_at?: string;
          telegram_chat_id?: number | null;
          telegram_link_token?: string | null;
          telegram_bot_messages?: number[] | null;
          telegram_message_index?: Json | null;
        };
      };
      challenges: {
        Row: {
          id: string;
          author_id: string;
          topic: string;
          position_hint: string;
          status: ChallengeStatus;
          category: string | null;
          max_rounds: number;
          accepted_by: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          topic: string;
          position_hint: string;
          status?: ChallengeStatus;
          category?: string | null;
          max_rounds?: number;
          accepted_by?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          topic?: string;
          position_hint?: string;
          status?: ChallengeStatus;
          category?: string | null;
          max_rounds?: number;
          accepted_by?: string | null;
          created_at?: string;
          expires_at?: string;
        };
      };
      challenge_messages: {
        Row: {
          id: string;
          challenge_id: string;
          author_id: string | null;
          content: string;
          is_ai: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          author_id?: string | null;
          content: string;
          is_ai?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          author_id?: string | null;
          content?: string;
          is_ai?: boolean;
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
          category: string | null;
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
          category?: string | null;
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
          category?: string | null;
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
      user_unique_achievements: {
        Row: {
          id: string;
          user_id: string;
          dispute_id: string | null;
          title: string;
          description: string;
          icon: string;
          points: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dispute_id?: string | null;
          title: string;
          description: string;
          icon: string;
          points?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          dispute_id?: string | null;
          title?: string;
          description?: string;
          icon?: string;
          points?: number;
          created_at?: string;
        };
      };
      user_ai_profiles: {
        Row: {
          user_id: string;
          argumentation_style: string;
          compromise_tendency: number;
          ai_hint_reaction: string;
          typical_planes: string[];
          consensus_rate: number;
          avg_response_time: number;
          impulsivity: number;
          empathy_score: number;
          ai_summary: string | null;
          hints_accepted: number;
          hints_ignored: number;
          hints_total: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          argumentation_style?: string;
          compromise_tendency?: number;
          ai_hint_reaction?: string;
          typical_planes?: string[];
          consensus_rate?: number;
          avg_response_time?: number;
          impulsivity?: number;
          empathy_score?: number;
          ai_summary?: string | null;
          hints_accepted?: number;
          hints_ignored?: number;
          hints_total?: number;
          updated_at?: string;
        };
        Update: {
          argumentation_style?: string;
          compromise_tendency?: number;
          ai_hint_reaction?: string;
          typical_planes?: string[];
          consensus_rate?: number;
          avg_response_time?: number;
          impulsivity?: number;
          empathy_score?: number;
          ai_summary?: string | null;
          hints_accepted?: number;
          hints_ignored?: number;
          hints_total?: number;
          updated_at?: string;
        };
      };
      user_counterparts: {
        Row: {
          id: string;
          user_id: string;
          counterpart_id: string;
          dispute_count: number;
          consensus_count: number;
          last_dispute_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          counterpart_id: string;
          dispute_count?: number;
          consensus_count?: number;
          last_dispute_at?: string;
        };
        Update: {
          dispute_count?: number;
          consensus_count?: number;
          last_dispute_at?: string;
        };
      };
      release_announcements: {
        Row: {
          id: string;
          slug: string;
          title: string;
          summary: string;
          features: string[];
          hero_image_url: string | null;
          notes: string | null;
          source_commits: string[] | null;
          sent_to_bot_at: string | null;
          sent_to_channel_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          summary: string;
          features?: string[];
          hero_image_url?: string | null;
          notes?: string | null;
          source_commits?: string[] | null;
          sent_to_bot_at?: string | null;
          sent_to_channel_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          title?: string;
          summary?: string;
          features?: string[];
          hero_image_url?: string | null;
          notes?: string | null;
          source_commits?: string[] | null;
          sent_to_bot_at?: string | null;
          sent_to_channel_at?: string | null;
          updated_at?: string;
        };
      };
      ai_hint_logs: {
        Row: {
          id: string;
          dispute_id: string;
          user_id: string;
          round: number;
          hint_text: string;
          tone_changed: boolean | null;
          positions_converged: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          dispute_id: string;
          user_id: string;
          round: number;
          hint_text: string;
          tone_changed?: boolean | null;
          positions_converged?: boolean | null;
          created_at?: string;
        };
        Update: {
          tone_changed?: boolean | null;
          positions_converged?: boolean | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      dispute_status: DisputeStatus;
      resolution_status: ResolutionStatus;
      challenge_status: ChallengeStatus;
    };
  };
}
