'use client';

import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { Message } from '@/types';

interface ChatPanelProps {
  sessionId: string;
  userId: string;
  socket: Socket | null;
  initialMessages: Message[];
}

export default function ChatPanel({
  sessionId,
  userId,
  socket,
  initialMessages,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => {
        // Deduplicate — socket echoes to all including sender
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => { socket.off('new_message'); };
  }, [socket]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !socket) return;

    socket.emit('send_message', {
      sessionId,
      userId,
      content: trimmed,
    });

    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-gray-800 bg-gray-900">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-600 text-center mt-4">No messages yet. Say hi!</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.user_id === userId;
          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              {!isOwn && (
                <span className="text-xs text-gray-500 mb-0.5 px-1">
                  {msg.sender?.full_name ?? 'Partner'}
                </span>
              )}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                  isOwn
                    ? 'bg-brand-500 text-white rounded-tr-sm'
                    : 'bg-gray-800 text-gray-200 rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-xs text-gray-600 mt-0.5 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-2 px-3 py-3 border-t border-gray-800 bg-gray-900">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-medium px-3 py-2 rounded-lg transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
