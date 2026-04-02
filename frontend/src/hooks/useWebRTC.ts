'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface UseWebRTCProps {
  socket: Socket | null;
  sessionId: string;
  isCaller: boolean;
}

export function useWebRTC({ socket, sessionId, isCaller }: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callActive, setCallActive] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // ✅ Create Peer
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('webrtc_ice_candidate', {
          sessionId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('🎥 Remote stream received');
      const stream = event.streams[0];
      if (!stream) return;
      stream.getTracks().forEach((t) =>
        console.log('TRACK:', t.kind, t.readyState)
      );
      setRemoteStream(stream);
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') setCallActive(true);
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setCallActive(false);
        setRemoteStream(null);
      }
    };

    return pc;
  }, [socket, sessionId]);

  // ✅ Shared helper — get media once, reuse after that
  const getLocalStream = useCallback(async (): Promise<MediaStream> => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // ✅ Start Call
  // - Caller (mentor): gets media → creates PC → adds tracks → sends offer
  // - Callee (student): gets media → creates PC → adds tracks → waits for offer
  //   (tracks must be added before offer arrives so SDP negotiation includes audio)
  const startCall = useCallback(async () => {
    if (!socket || peerRef.current) return;

    try {
      const stream = await getLocalStream();
      const pc = createPeerConnection();
      peerRef.current = pc;

      // Always add tracks — this is what puts audio/video in the SDP
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (isCaller) {
        console.log('📞 Creating offer...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { sessionId, offer });
      }
      // Callee just waits — offer will arrive via socket
    } catch (err) {
      console.error('❌ getUserMedia error:', err);
    }
  }, [socket, isCaller, sessionId, createPeerConnection, getLocalStream]);

  // ✅ Signaling
  useEffect(() => {
    if (!socket) return;

    socket.on('webrtc_offer', async ({ offer }) => {
      console.log('📩 Offer received');
      try {
        // If peerRef already exists (callee called startCall via session_ready),
        // tracks are already added — just set remote desc and answer.
        // If peerRef does NOT exist, set everything up now.
        if (!peerRef.current) {
          const stream = await getLocalStream();
          const pc = createPeerConnection();
          peerRef.current = pc;
          // Add tracks BEFORE setRemoteDescription — required for audio/video in answer SDP
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        }

        await peerRef.current!.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerRef.current!.createAnswer();
        await peerRef.current!.setLocalDescription(answer);
        socket.emit('webrtc_answer', { sessionId, answer });
      } catch (err) {
        console.error('❌ Error handling offer:', err);
      }
    });

    socket.on('webrtc_answer', async ({ answer }) => {
      console.log('📩 Answer received');
      try {
        await peerRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('❌ Error handling answer:', err);
      }
    });

    socket.on('webrtc_ice_candidate', async ({ candidate }) => {
      try {
        await peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('❌ ICE error:', e);
      }
    });

    return () => {
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
    };
  }, [socket, sessionId, createPeerConnection, getLocalStream]);

  // ✅ session_ready — triggers startCall for both users.
  // Caller sends the offer; callee pre-loads media + adds tracks before offer arrives.
  // This eliminates the race condition where offer arrives before callee has tracks ready.
  useEffect(() => {
    if (!socket) return;

    socket.on('session_ready', () => {
      console.log('🚀 Session ready');
      startCall();
    });

    return () => {
      socket.off('session_ready');
    };
  }, [socket, startCall]);

  // ✅ Controls
  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsMuted((m) => !m);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsCameraOff((c) => !c);
  };

  const stopCall = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current = null; // ← reset so next call re-acquires fresh media
    setLocalStream(null);
    setRemoteStream(null);
    setCallActive(false);
  };

  return {
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    callActive,
    startCall,
    toggleMute,
    toggleCamera,
    stopCall,
  };
}