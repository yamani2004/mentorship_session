'use client';

import { useRef, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { Socket } from 'socket.io-client';

interface SharedEditorProps {
  sessionId: string;
  socket: Socket | null;
  language: string;
  onLanguageChange: (lang: string) => void;
}

const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust', 'html', 'css', 'sql'];

const THROTTLE_MS = 80; // emit at most every 80ms

export default function SharedEditor({
  sessionId,
  socket,
  language,
  onLanguageChange,
}: SharedEditorProps) {
  const lastEmitTime = useRef(0);
  const isRemoteChange = useRef(false); // prevent echo

  const handleEditorMount: OnMount = (editor) => {
    // Listen for incoming code updates from partner
    socket?.on('code_update', ({ code, language: lang }: { code: string; language: string }) => {
      isRemoteChange.current = true;
      const model = editor.getModel();
      if (model && model.getValue() !== code) {
        // Preserve cursor position during remote update
        const position = editor.getPosition();
        model.setValue(code);
        if (position) editor.setPosition(position);
      }
      if (lang && lang !== language) onLanguageChange(lang);
      isRemoteChange.current = false;
    });

    // Send local changes to partner (throttled)
    editor.onDidChangeModelContent(() => {
      if (isRemoteChange.current) return;

      const now = Date.now();
      if (now - lastEmitTime.current < THROTTLE_MS) return;
      lastEmitTime.current = now;

      socket?.emit('code_change', {
        sessionId,
        code: editor.getValue(),
        language,
      });
    });
  };

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const lang = e.target.value;
      onLanguageChange(lang);
      socket?.emit('language_change', { sessionId, language: lang });
    },
    [onLanguageChange, sessionId, socket]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-xs text-gray-500 font-mono">editor</span>
        <select
          value={language}
          onChange={handleLanguageChange}
          className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-brand-500 transition"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
