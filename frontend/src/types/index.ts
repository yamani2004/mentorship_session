export type UserRole = 'mentor' | 'student';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Session {
  id: string;
  title: string;
  mentor_id: string;
  student_id?: string;
  status: 'waiting' | 'active' | 'ended';
  join_code: string;
  language: string;
  created_at: string;
  ended_at?: string;
  mentor?: Pick<Profile, 'full_name' | 'avatar_url'>;
  student?: Pick<Profile, 'full_name' | 'avatar_url'>;
}

export interface Message {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  created_at: string;
  sender?: Pick<Profile, 'full_name'>;
}
