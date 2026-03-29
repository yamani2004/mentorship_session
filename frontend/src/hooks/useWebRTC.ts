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
  isCaller: boolean; // mentor = caller, student = callee
}

export function useWebRTC({ socket, sessionId, isCaller }: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callActive, setCallActive] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_ice_candidate', {
          sessionId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setCallActive(true);
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setCallActive(false);
        setRemoteStream(null);
      }
    };

    return pc;
  }, [socket, sessionId]);

  // Get user media and set up peer connection
  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      peerRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Mentor creates offer
      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit('webrtc_offer', { sessionId, offer });
      }
    } catch (err) {
      console.error('Failed to get media devices:', err);
    }
  }, [createPeerConnection, isCaller, sessionId, socket]);

  // Socket signaling events
  useEffect(() => {
    if (!socket) return;

    socket.on('webrtc_offer', async ({ offer }) => {
      if (!peerRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = createPeerConnection();
        peerRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      await peerRef.current!.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerRef.current!.createAnswer();
      await peerRef.current!.setLocalDescription(answer);
      socket.emit('webrtc_answer', { sessionId, answer });
    });

    socket.on('webrtc_answer', async ({ answer }) => {
      await peerRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('webrtc_ice_candidate', async ({ candidate }) => {
      try {
        await peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('ICE candidate error:', e);
      }
    });

    return () => {
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
    };
  }, [socket, sessionId, createPeerConnection]);

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
