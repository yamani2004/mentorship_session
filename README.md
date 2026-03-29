# 🚀 1-on-1 Mentorship Platform

A real-time web platform for mentor-student sessions with live collaborative code editing, video calling (WebRTC), and chat.

---

## 📁 Project Structure

```
mentorship-platform/
├── frontend/          # Next.js + TypeScript + Tailwind
└── backend/           # Node.js + Express.js + Socket.io
```

---

## 🛠 Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | Next.js 14, TypeScript, Tailwind CSS    |
| Editor    | Monaco Editor (@monaco-editor/react)    |
| Backend   | Node.js, Express.js                     |
| Realtime  | Socket.io                               |
| Video     | WebRTC (native browser API)             |
| Auth + DB | Supabase (Auth, PostgreSQL)             |
| Deploy    | Vercel (frontend), Railway (backend)    |

---

## ⚡ Quick Start

### 1. Clone & Install

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 2. Setup Environment Variables

**backend/.env**
```
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:3000
```

**frontend/.env.local**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

### 3. Run

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

---

## 🗄 Database Schema (Supabase SQL)

Run this in your Supabase SQL editor:

```sql
-- Users profile (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('mentor', 'student')) not null,
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- Sessions
create table sessions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  mentor_id uuid references profiles(id) on delete cascade,
  student_id uuid references profiles(id),
  status text check (status in ('waiting', 'active', 'ended')) default 'waiting',
  join_code text unique not null,
  language text default 'javascript',
  created_at timestamp with time zone default now(),
  ended_at timestamp with time zone
);

-- Messages
create table messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade,
  user_id uuid references profiles(id),
  content text not null,
  created_at timestamp with time zone default now()
);

-- Code Snapshots (optional)
create table code_snapshots (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade,
  code text,
  language text,
  saved_at timestamp with time zone default now()
);

-- RLS Policies
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table messages enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

create policy "Anyone authenticated can view sessions" on sessions for select using (auth.role() = 'authenticated');
create policy "Mentors can create sessions" on sessions for insert with check (auth.uid() = mentor_id);
create policy "Session participants can update" on sessions for update using (auth.uid() = mentor_id or auth.uid() = student_id);

create policy "Session participants can view messages" on messages for select using (
  exists (select 1 from sessions where id = session_id and (mentor_id = auth.uid() or student_id = auth.uid()))
);
create policy "Session participants can insert messages" on messages for insert with check (
  exists (select 1 from sessions where id = session_id and (mentor_id = auth.uid() or student_id = auth.uid()))
);
```

---

## 🚀 Deployment

### Frontend → Vercel
```bash
cd frontend
npx vercel --prod
```

### Backend → Railway
1. Push backend to GitHub
2. Connect repo to Railway
3. Add environment variables in Railway dashboard
4. Deploy

---

## 🎯 Features

- ✅ Supabase Auth (email/password) with Mentor/Student roles
- ✅ Session creation (mentor) and joining via link (student)
- ✅ Real-time collaborative Monaco code editor via Socket.io
- ✅ Session-scoped chat with message history
- ✅ 1-on-1 WebRTC video call with mic/camera toggle
- ✅ Disconnect/reconnect handling
- ✅ Responsive UI with Tailwind CSS
