import {
  createSessionToken,
  ensureAuthTables,
  getSessionMaxAge,
  hashPassword,
  serializeSessionCookie,
} from '../../../lib/auth';
import { getClient, query } from '../../../lib/db';
import { provisionVirtualAccountForUser } from '../../../lib/wallet';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const {
    fullName,
    username,
    email,
    phone,
    address,
    referralUsername,
    bvn,
    nin,
    password,
    confirmPassword,
    acceptedTerms,
  } = req.body;

  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedUsername = username?.trim().toLowerCase();
  const normalizedPhone = phone?.trim();
  const normalizedReferral = referralUsername?.trim().toLowerCase() || null;
  const normalizedBvn = bvn?.trim() || null;
  const normalizedNin = nin?.trim() || null;

  if (
    !fullName?.trim() ||
    !normalizedUsername ||
    !normalizedEmail ||
    !normalizedPhone ||
    !address?.trim() ||
    !password
  ) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  if (!acceptedTerms) {
    return res.status(400).json({ error: 'You must agree to the terms and conditions.' });
  }

  if ((process.env.VIRTUAL_ACCOUNT_PROVIDER || '').toLowerCase() === 'monnify') {
    if (!normalizedBvn && !normalizedNin) {
      return res.status(400).json({ error: 'BVN or NIN is required for Monnify account allocation.' });
    }
  }

  try {
    await ensureAuthTables();

    if (normalizedReferral) {
      const referralCheck = await query('SELECT id FROM users WHERE username = $1 LIMIT 1', [
        normalizedReferral,
      ]);

      if (!referralCheck.rows.length) {
        return res.status(400).json({ error: 'Referral username was not found.' });
      }
    }

    const existingUser = await query(
      `
        SELECT id, username, email, phone
        FROM users
        WHERE username = $1 OR email = $2 OR phone = $3
        LIMIT 1
      `,
      [normalizedUsername, normalizedEmail, normalizedPhone]
    );

    if (existingUser.rows.length) {
      return res.status(409).json({ error: 'Username, email, or phone already exists.' });
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      const passwordHash = hashPassword(password);
      const createdUser = await client.query(
        `
          INSERT INTO users (
            full_name,
            username,
            email,
            phone,
            address,
            referral_username,
            password_hash,
            bvn,
            nin
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id, full_name, username, email
        `,
        [
          fullName.trim(),
          normalizedUsername,
          normalizedEmail,
          normalizedPhone,
          address.trim(),
          normalizedReferral,
          passwordHash,
          normalizedBvn,
          normalizedNin,
        ]
      );

      const sessionToken = createSessionToken();
      const maxAge = getSessionMaxAge(false);

      await client.query(
        `
          INSERT INTO sessions (user_id, token, expires_at)
          VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 second'))
        `,
        [createdUser.rows[0].id, sessionToken, maxAge]
      );

      try {
        await provisionVirtualAccountForUser({
          user: {
            id: createdUser.rows[0].id,
            username: createdUser.rows[0].username,
            full_name: createdUser.rows[0].full_name,
            email: createdUser.rows[0].email,
            bvn: normalizedBvn,
            nin: normalizedNin,
          },
          client,
        });
      } catch (virtualAccountError) {
        console.error('Virtual account provisioning failed during registration', virtualAccountError);
      }

      await client.query('COMMIT');

      res.setHeader('Set-Cookie', serializeSessionCookie(sessionToken, maxAge));
      return res.status(201).json({
        message: 'Account created successfully.',
        user: createdUser.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Register error', error);
    if (error?.message?.includes('DATABASE_URL is not configured')) {
      return res.status(500).json({ error: 'Database is not configured on the server.' });
    }

    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
      return res.status(500).json({ error: 'Database connection failed.' });
    }

    if (error?.code === '28P01') {
      return res.status(500).json({ error: 'Database authentication failed.' });
    }

    if (error?.code === '3D000') {
      return res.status(500).json({ error: 'Database does not exist.' });
    }

    return res.status(500).json({ error: 'Unable to create account right now.' });
  }
}
