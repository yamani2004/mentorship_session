'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import type { Session } from '@/types';

export default function DashboardPage() {
  const { profile, signOut, loading } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Create session state (mentor)
  const [newTitle, setNewTitle] = useState('');
  const [newLang, setNewLang] = useState('javascript');
  const [creating, setCreating] = useState(false);

  // Join session state (student)
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !profile) router.replace('/auth/onboarding');
  }, [loading, profile, router]);

  useEffect(() => {
    api.get('/api/sessions')
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoadingSessions(false));
  }, []);

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const session = await api.post('/api/sessions', { title: newTitle, language: newLang });
      router.push(`/session/${session.id}`);
    } catch (err: unknown) {
      const e = err as { error?: string };
      setError(e?.error || 'Failed to create session');
      setCreating(false);
    }
  };

  const joinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    setError('');
    try {
      const session = await api.post('/api/sessions/join', { join_code: joinCode });
      router.push(`/session/${session.id}`);
    } catch (err: unknown) {
      const e = err as { error?: string };
      setError(e?.error || 'Session not found');
      setJoining(false);
    }
  };

  if (loading || !profile) return null;

  const isMentor = profile.role === 'mentor';

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">MentorSpace</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            <span className="capitalize text-brand-400 font-medium">{profile.role}</span>{' '}
            — {profile.full_name}
          </span>
          <button
            onClick={signOut}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Card */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          {isMentor ? (
            <>
              <h2 className="text-lg font-semibold text-white mb-5">Create a new session</h2>
              <form onSubmit={createSession} className="space-y-4">
                <div className="flex gap-3">
                  <input
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Session title, e.g. React hooks deep dive"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                  />
                  <select
                    value={newLang}
                    onChange={(e) => setNewLang(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-brand-500 transition"
                  >
                    {['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust'].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={creating}
                    className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition whitespace-nowrap"
                  >
                    {creating ? 'Creating...' : 'Create session'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-5">Join a session</h2>
              <form onSubmit={joinSession} className="flex gap-3">
                <input
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter session code"
                  maxLength={8}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition font-mono tracking-widest uppercase"
                />
                <button
                  type="submit"
                  disabled={joining}
                  className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition"
                >
                  {joining ? 'Joining...' : 'Join'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Session History */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            {isMentor ? 'Your sessions' : 'Joined sessions'}
          </h2>

          {loadingSessions ? (
            <div className="text-gray-500 text-sm">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center text-gray-500">
              No sessions yet.{' '}
              {isMentor ? 'Create your first session above.' : 'Join one using a session code.'}
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-medium">{s.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Code: <span className="font-mono text-gray-300">{s.join_code}</span>
                      {' · '}
                      <span className={`capitalize ${
                        s.status === 'active' ? 'text-green-400' :
                        s.status === 'waiting' ? 'text-yellow-400' : 'text-gray-500'
                      }`}>{s.status}</span>
                    </p>
                  </div>
                  {s.status !== 'ended' && (
                    <button
                      onClick={() => router.push(`/session/${s.id}`)}
                      className="text-sm text-brand-400 hover:text-brand-300 font-medium transition"
                    >
                      Rejoin →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
