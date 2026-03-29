'use client';

import { useEffect, useRef } from 'react';

interface VideoPanelProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  callActive: boolean;
  onStartCall: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onStopCall: () => void;
  partnerName?: string;
}

export default function VideoPanel({
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  callActive,
  onStartCall,
  onToggleMute,
  onToggleCamera,
  onStopCall,
  partnerName,
}: VideoPanelProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Remote video (main) */}
      <div className="relative flex-1 bg-gray-900 flex items-center justify-center">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center text-gray-500">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3 text-2xl">
              👤
            </div>
            <p className="text-sm">
              {callActive ? 'Waiting for video...' : partnerName ? `${partnerName} not on call` : 'No partner connected'}
            </p>
          </div>
        )}

        {/* Local video (pip) */}
        {localStream && (
          <div className="absolute bottom-3 right-3 w-28 h-20 rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg bg-gray-800">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {isCameraOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                Camera off
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 border-t border-gray-800">
        {!localStream ? (
          <button
            onClick={onStartCall}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
          >
            📹 Start video
          </button>
        ) : (
          <>
            <ControlBtn
              onClick={onToggleMute}
              active={isMuted}
              label={isMuted ? '🔇' : '🎙️'}
              title={isMuted ? 'Unmute' : 'Mute'}
            />
            <ControlBtn
              onClick={onToggleCamera}
              active={isCameraOff}
              label={isCameraOff ? '📵' : '📹'}
              title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
            />
            <button
              onClick={onStopCall}
              className="bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-2 rounded-lg transition font-medium"
              title="End call"
            >
              📴 End
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ControlBtn({
  onClick,
  active,
  label,
  title,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition ${
        active
          ? 'bg-red-800 hover:bg-red-700 text-white'
          : 'bg-gray-800 hover:bg-gray-700 text-white'
      }`}
    >
      {label}
    </button>
  );
}
