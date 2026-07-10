import { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Subject = Database['public']['Tables']['subjects']['Row'];
export type PastPaper = Database['public']['Tables']['past_papers']['Row'];
export type Topic = Database['public']['Tables']['topics']['Row'];
export type TopicSet = Database['public']['Tables']['topic_sets']['Row'];
export type TopicSetQuestion = Database['public']['Tables']['topic_set_questions']['Row'];
export type Target = Database['public']['Tables']['targets']['Row'];
export type TargetItem = Database['public']['Tables']['target_items']['Row'];

export type MathP2QuestionResult = Database['public']['Tables']['math_p2_question_results']['Row'];
export type QuestionResultValue = 'right' | 'wrong' | 'not_taught';
export type PaperStatus = 'not_started' | 'in_progress' | 'completed';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type UserRole = 'student' | 'parent';

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
}
