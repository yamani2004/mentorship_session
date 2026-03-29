const supabase = require('../config/supabase');

/**
 * Middleware: verifies the Supabase JWT sent in Authorization header.
 * Attaches req.user = { id, email, role } on success.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || 'student',
      full_name: profile?.full_name || '',
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token verification failed' });
  }
}

module.exports = authMiddleware;
