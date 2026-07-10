export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: 'student' | 'parent';
          display_name: string | null;
          linked_student_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role: 'student' | 'parent';
          display_name?: string | null;
          linked_student_id?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          role?: 'student' | 'parent';
          display_name?: string | null;
          linked_student_id?: string | null;
        };
      };
      subjects: {
        Row: { id: string; name: string; sort_order: number };
        Insert: { id: string; name: string; sort_order?: number };
        Update: { name?: string; sort_order?: number };
      };
      past_papers: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          year: number;
          paper_number: number;
          status: 'not_started' | 'in_progress' | 'completed';
          score: number | null;
          completion_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          subject_id: string;
          year: number;
          paper_number: number;
          status?: 'not_started' | 'in_progress' | 'completed';
          score?: number | null;
          completion_date?: string | null;
          notes?: string | null;
        };
        Update: {
          status?: 'not_started' | 'in_progress' | 'completed';
          score?: number | null;
          completion_date?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      topics: {
        Row: {
          id: string;
          subject_id: string;
          topic_name: string;
          parent_topic_id: string | null;
          difficulty_tag: string | null;
          estimated_time_minutes: number | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          topic_name: string;
          parent_topic_id?: string | null;
          difficulty_tag?: string | null;
          estimated_time_minutes?: number | null;
          sort_order?: number;
        };
        Update: {
          topic_name?: string;
          parent_topic_id?: string | null;
          difficulty_tag?: string | null;
          estimated_time_minutes?: number | null;
          sort_order?: number;
        };
      };
      topic_sets: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          name: string;
          topic_tag: string | null;
          estimated_difficulty: 'easy' | 'medium' | 'hard' | null;
          estimated_time_minutes: number | null;
          status: 'not_started' | 'in_progress' | 'completed';
          created_by_role: 'student' | 'parent';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          subject_id: string;
          name: string;
          topic_tag?: string | null;
          estimated_difficulty?: 'easy' | 'medium' | 'hard' | null;
          estimated_time_minutes?: number | null;
          status?: 'not_started' | 'in_progress' | 'completed';
          created_by_role?: 'student' | 'parent';
        };
        Update: {
          name?: string;
          topic_tag?: string | null;
          estimated_difficulty?: 'easy' | 'medium' | 'hard' | null;
          estimated_time_minutes?: number | null;
          status?: 'not_started' | 'in_progress' | 'completed';
          updated_at?: string;
        };
      };
      topic_set_questions: {
        Row: {
          id: string;
          topic_set_id: string;
          question_ref: string;
          notes: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          topic_set_id: string;
          question_ref: string;
          notes?: string | null;
          sort_order?: number;
        };
        Update: { question_ref?: string; notes?: string | null; sort_order?: number };
      };
      targets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          start_date: string;
          end_date: string;
        };
        Update: { name?: string; start_date?: string; end_date?: string; updated_at?: string };
      };
      math_p2_question_results: {
        Row: {
          id: string;
          user_id: string;
          year: number;
          question_number: number;
          result: 'right' | 'wrong' | 'not_taught';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          year: number;
          question_number: number;
          result: 'right' | 'wrong' | 'not_taught';
        };
        Update: {
          result?: 'right' | 'wrong' | 'not_taught';
          updated_at?: string;
        };
      };
      target_items: {
        Row: {
          id: string;
          target_id: string;
          subject_id: string | null;
          item_type: 'past_paper_year' | 'past_paper_paper' | 'topic_set' | 'topic';
          item_ref_id: string | null;
          required_count: number;
          completed_count: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          target_id: string;
          subject_id?: string | null;
          item_type: 'past_paper_year' | 'past_paper_paper' | 'topic_set' | 'topic';
          item_ref_id?: string | null;
          required_count?: number;
          completed_count?: number;
          sort_order?: number;
        };
        Update: {
          subject_id?: string | null;
          item_type?: 'past_paper_year' | 'past_paper_paper' | 'topic_set' | 'topic';
          item_ref_id?: string | null;
          required_count?: number;
          completed_count?: number;
          sort_order?: number;
        };
      };
    };
  };
}
