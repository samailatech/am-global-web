import {
  createSessionToken,
  ensureAuthTables,
  getSessionMaxAge,
  serializeSessionCookie,
  verifyPassword,
} from '../../../lib/auth';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { identifier, password, rememberMe } = req.body;
  const normalizedIdentifier = identifier?.trim();

  if (!normalizedIdentifier || !password) {
    return res.status(400).json({ error: 'Phone, email, or username and password are required.' });
  }

  try {
    await ensureAuthTables();

    const { rows } = await query(
      `
        SELECT id, full_name, username, email, phone, password_hash
        FROM users
        WHERE LOWER(email) = LOWER($1)
          OR LOWER(username) = LOWER($1)
          OR phone = $1
        LIMIT 1
      `,
      [normalizedIdentifier]
    );

    const user = rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid login credentials.' });
    }

    const sessionToken = createSessionToken();
    const maxAge = getSessionMaxAge(Boolean(rememberMe));

    await query(
      `
        INSERT INTO sessions (user_id, token, expires_at)
        VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 second'))
      `,
      [user.id, sessionToken, maxAge]
    );

    res.setHeader('Set-Cookie', serializeSessionCookie(sessionToken, maxAge));
    return res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Login error', error);
    return res.status(500).json({ error: 'Unable to log in right now.' });
  }
}
