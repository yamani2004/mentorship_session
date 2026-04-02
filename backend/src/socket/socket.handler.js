const supabase = require('../config/supabase');

/**
 * Socket.io event handler.
 *
 * Rooms: each session has a room named by session ID.
 *
 * Events handled:
 *  - join_session         → join socket room
 *  - code_change          → broadcast code to partner
 *  - language_change      → broadcast language change
 *  - send_message         → save to DB + broadcast
 *  - webrtc_offer         → forward WebRTC offer
 *  - webrtc_answer        → forward WebRTC answer
 *  - webrtc_ice_candidate → forward ICE candidate
 *  - disconnect           → notify partner
 */
function setupSocketHandlers(io) {
  // Track which socket belongs to which session
  const sessionMembers = {}; // sessionId → [socketId, socketId]

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── JOIN SESSION ──────────────────────────────────────
    socket.on('join_session', ({ sessionId, userId, userName }) => {
      socket.join(sessionId);
      socket.sessionId = sessionId;
      socket.userId = userId;
      socket.userName = userName;
      
      //Earlier Version Updated on 02-04-2026
      // if (!sessionMembers[sessionId]) {
      //   sessionMembers[sessionId] = [];
      // }
      // sessionMembers[sessionId].push(socket.id);

      //Added on 02-04-2026 to use Set instead of array for sessionMembers to avoid duplicates and simplify management
      if (!sessionMembers[sessionId]) {
          sessionMembers[sessionId] = new Set();
      }
       sessionMembers[sessionId].add(socket.id);

       console.log(`👥 Members:`, sessionMembers[sessionId].size);

      console.log(`👤 ${userName} joined session ${sessionId}`);

      // Notify the other participant
      socket.to(sessionId).emit('partner_joined', { userId, userName });

      // If two people are in room, signal ready for WebRTC
      if (sessionMembers[sessionId].size === 2) {
        console.log(`👥 Members:`, sessionMembers[sessionId].size);
        io.to(sessionId).emit('session_ready');
      }
    });

    // ─── CODE EDITOR SYNC ─────────────────────────────────
    // Throttle on client side; broadcast to others in room only
    socket.on('code_change', ({ sessionId, code, language }) => {
      socket.to(sessionId).emit('code_update', { code, language });
    });

    socket.on('language_change', ({ sessionId, language }) => {
      socket.to(sessionId).emit('language_update', { language });
    });

    // ─── CHAT ─────────────────────────────────────────────
    socket.on('send_message', async ({ sessionId, userId, content }) => {
      try {
        // Persist to Supabase
        const { data, error } = await supabase
          .from('messages')
          .insert({ session_id: sessionId, user_id: userId, content })
          .select(`*, sender:profiles(full_name)`)
          .single();

        if (error) throw error;

        // Broadcast to everyone in the session including sender
        io.to(sessionId).emit('new_message', data);
      } catch (err) {
        console.error('Message save error:', err.message);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // ─── WEBRTC SIGNALING ─────────────────────────────────
    socket.on('webrtc_offer', ({ sessionId, offer }) => {
      socket.to(sessionId).emit('webrtc_offer', { offer });
    });

    socket.on('webrtc_answer', ({ sessionId, answer }) => {
      socket.to(sessionId).emit('webrtc_answer', { answer });
    });

    socket.on('webrtc_ice_candidate', ({ sessionId, candidate }) => {
      socket.to(sessionId).emit('webrtc_ice_candidate', { candidate });
    });

    // ─── DISCONNECT ───────────────────────────────────────
    socket.on('disconnect', () => {
      const { sessionId, userName } = socket;

      if (sessionId) {
        // Remove from tracking
        if (sessionMembers[sessionId]) {
          //Earlier Version Updated on 02-04-2026
          // sessionMembers[sessionId] = sessionMembers[sessionId].filter(
          //   (id) => id !== socket.id
          // );
          // if (sessionMembers[sessionId].length === 0) {
          //   delete sessionMembers[sessionId];
          // }


          //Added on 02-04-2026 to use Set for sessionMembers

          sessionMembers[sessionId].delete(socket.id);
            if (sessionMembers[sessionId].size === 0) {
                delete sessionMembers[sessionId];
            }
        }

        // Notify the other participant
        socket.to(sessionId).emit('partner_left', { userName });
        console.log(`👋 ${userName} disconnected from session ${sessionId}`);
      }
    });
  });
}

module.exports = { setupSocketHandlers };
