import { clearSessionCookie, getSessionTokenFromCookie } from '../../../lib/auth';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const token = getSessionTokenFromCookie(req.headers.cookie);

    if (token) {
      await query('DELETE FROM sessions WHERE token = $1', [token]);
    }

    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error', error);
    return res.status(500).json({ error: 'Unable to log out right now.' });
  }
}
