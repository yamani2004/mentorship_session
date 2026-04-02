'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useWebRTC } from '@/hooks/useWebRTC';
import { api } from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';
import SharedEditor from '@/components/editor/SharedEditor';
import VideoPanel from '@/components/video/VideoPanel';
import ChatPanel from '@/components/chat/ChatPanel';
import type { Session, Message } from '@/types';

// ✅ moved outside component to ensure single instance across renders

export default function SessionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [language, setLanguage] = useState('javascript');
  const [partnerStatus, setPartnerStatus] = useState<'waiting' | 'connected' | 'left'>('waiting');
  const [sessionEnded, setSessionEnded] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'video' | 'chat'>('video');

  
  //Earlier version without proper auth handling and socket management
  //const socket = getSocket();

  //Updated version on 02-04-2026 with better auth handling and socket management
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  if (!socketRef.current) {
  socketRef.current = getSocket();
  }

  const socket = socketRef.current;


  const isMentor = profile?.role === 'mentor';

  const { localStream, remoteStream, isMuted, isCameraOff, callActive, startCall, toggleMute, toggleCamera, stopCall } =
    useWebRTC({ socket, sessionId, isCaller: isMentor });

  // Load session + message history
  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) { router.replace('/auth/login'); return; }

    Promise.all([
      api.get(`/api/sessions/${sessionId}`),
      api.get(`/api/sessions/${sessionId}/messages`),
    ])
      .then(([sess, msgs]) => {
        setSession(sess);
        setMessages(msgs);
        setLanguage(sess.language);
        if (sess.status === 'ended') setSessionEnded(true);
      })
      .catch(() => router.replace('/dashboard'))
      .finally(() => setPageLoading(false));
  }, [authLoading, user, profile, sessionId, router]);

  // Connect socket
  useEffect(() => {
  if (!user || !profile || pageLoading) return;

  // ✅ connect only once
  if (!socket.connected) {
    socket.connect();
    console.log('🔌 Socket connecting...');
  }

  // ✅ join only once
  socket.emit('join_session', {
    sessionId,
    userId: user.id,
    userName: profile.full_name,
  });

  // listeners
  const handleJoin = ({ userName }: { userName: string }) => {
    setPartnerStatus('connected');
    console.log(`${userName} joined`);
  };

  const handleLeft = () => setPartnerStatus('left');

  const handleLanguage = ({ language }: { language: string }) => {
    setLanguage(language);
  };

  socket.on('partner_joined', handleJoin);
  socket.on('partner_left', handleLeft);
  socket.on('language_update', handleLanguage);
  socket.on('session_ready', () => setPartnerStatus('connected')); // ← ADD THIS

  return () => {
    socket.off('partner_joined', handleJoin);
    socket.off('partner_left', handleLeft);
    socket.off('language_update', handleLanguage);
    socket.off('session_ready'); // ← ADD THIS

    // ❗ DO NOT always disconnect (important)
    // only disconnect if you are leaving page permanently
    // disconnectSocket();
  };
}, [pageLoading]); // ✅ ONLY THIS

  const endSession = useCallback(async () => {
    await api.patch(`/api/sessions/${sessionId}/end`);
    stopCall();
    setSessionEnded(true);
  }, [sessionId, stopCall]);

  if (pageLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionEnded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <p className="text-2xl font-bold text-white mb-2">Session ended</p>
          <p className="text-gray-400 mb-6">This session has been closed.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-2.5 rounded-lg transition"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">{session?.title}</span>
          <span className="text-xs font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
            {session?.join_code}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            partnerStatus === 'connected' ? 'bg-green-900/50 text-green-400' :
            partnerStatus === 'left' ? 'bg-red-900/50 text-red-400' :
            'bg-yellow-900/50 text-yellow-400'
          }`}>
            {partnerStatus === 'connected' ? '● Partner connected'
              : partnerStatus === 'left' ? '● Partner left'
              : '● Waiting for partner'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isMentor && (
            <button
              onClick={endSession}
              className="text-sm bg-red-900/40 hover:bg-red-900/70 text-red-400 border border-red-800 px-3 py-1.5 rounded-lg transition"
            >
              End session
            </button>
          )}
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      {/* Main layout: Editor (left) + Sidebar (right) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code Editor — takes most of the space */}
        <div className="flex-1 overflow-hidden">
          <SharedEditor
            sessionId={sessionId}
            socket={socket}
            language={language}
            onLanguageChange={setLanguage}
          />
        </div>

        {/* Right sidebar: Video + Chat tabs */}
        <div className="w-80 flex flex-col border-l border-gray-800 bg-gray-900 flex-shrink-0">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-800">
            {(['video', 'chat'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-medium capitalize transition ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-brand-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'video' ? '📹 Video' : '💬 Chat'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'video' ? (
              <VideoPanel
                localStream={localStream}
                remoteStream={remoteStream}
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                callActive={callActive}
                onStartCall={startCall}
                onToggleMute={toggleMute}
                onToggleCamera={toggleCamera}
                onStopCall={stopCall}
                partnerName={isMentor ? session?.student?.full_name : session?.mentor?.full_name}
              />
            ) : (
              <ChatPanel
                sessionId={sessionId}
                userId={user!.id}
                socket={socket}
                initialMessages={messages}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
