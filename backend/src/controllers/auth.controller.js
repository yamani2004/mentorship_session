const supabase = require('../config/supabase');

/**
 * POST /api/auth/profile
 * Called after Supabase signup to store role and full_name in profiles table.
 */
async function createProfile(req, res) {
  const { full_name, role } = req.body;

  if (!full_name || !role) {
    return res.status(400).json({ error: 'full_name and role are required' });
  }

  if (!['mentor', 'student'].includes(role)) {
    return res.status(400).json({ error: 'role must be mentor or student' });
  }

  try {
    const { error } = await supabase.from('profiles').upsert({
      id: req.user.id,
      full_name,
      role,
    });

    if (error) throw error;

    return res.status(200).json({ message: 'Profile created', role });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/auth/me
 * Returns the current user's profile.
 */
async function getMe(req, res) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { createProfile, getMe };
