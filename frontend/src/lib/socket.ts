import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// ✅ Singleton socket instance
export function getSocket(): Socket {
  if (!socket) {
    socket = io(
      process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000',
      {
        transports: ['websocket'],
        autoConnect: false, // we control manually
      }
    );
  }
  return socket;
}

// ✅ Safe disconnect (DO NOT reset socket)
export function disconnectSocket() {
  if (socket && socket.connected) {
    console.log('🔌 Socket disconnecting...');
    socket.disconnect();
  }
}