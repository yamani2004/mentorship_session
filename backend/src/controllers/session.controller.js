const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

/**
 * POST /api/sessions
 * Mentor creates a new session.
 */
async function createSession(req, res) {
  if (req.user.role !== 'mentor') {
    return res.status(403).json({ error: 'Only mentors can create sessions' });
  }

  const { title, language = 'javascript' } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });

  // Generate a short unique join code
  const join_code = uuidv4().split('-')[0].toUpperCase(); // e.g. "A3F8BC2E"

  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        title,
        mentor_id: req.user.id,
        language,
        join_code,
        status: 'waiting',
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/sessions/join
 * Student joins a session using a join code.
 */
async function joinSession(req, res) {
  const { join_code } = req.body;

  if (!join_code) return res.status(400).json({ error: 'join_code is required' });

  try {
    // Find the session
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('join_code', join_code.toUpperCase())
      .single();

    if (error || !session) return res.status(404).json({ error: 'Session not found' });

    if (session.status === 'ended') {
      return res.status(400).json({ error: 'This session has ended' });
    }

    // Assign student if not already assigned
    if (!session.student_id) {
      await supabase
        .from('sessions')
        .update({ student_id: req.user.id, status: 'active' })
        .eq('id', session.id);
    }

    return res.status(200).json({ ...session, student_id: req.user.id, status: 'active' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * PATCH /api/sessions/:id/end
 * Mentor ends the session.
 */
async function endSession(req, res) {
  const { id } = req.params;

  try {
    const { data: session } = await supabase
      .from('sessions')
      .select('mentor_id')
      .eq('id', id)
      .single();

    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (session.mentor_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the session mentor can end it' });
    }

    await supabase
      .from('sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', id);

    return res.status(200).json({ message: 'Session ended' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/sessions/:id
 * Get session details.
 */
async function getSession(req, res) {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        mentor:profiles!sessions_mentor_id_fkey(full_name, avatar_url),
        student:profiles!sessions_student_id_fkey(full_name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/sessions
 * Get all sessions for the current user.
 */
async function getMySessions(req, res) {
  try {
    const column = req.user.role === 'mentor' ? 'mentor_id' : 'student_id';

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq(column, req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/sessions/:id/messages
 * Get chat message history for a session.
 */
async function getMessages(req, res) {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`*, sender:profiles(full_name)`)
      .eq('session_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createSession,
  joinSession,
  endSession,
  getSession,
  getMySessions,
  getMessages,
};
