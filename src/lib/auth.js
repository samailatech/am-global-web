import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

import { query } from './db';
import { ensureFundingTables, provisionVirtualAccountForUser } from './wallet';

const SESSION_COOKIE_NAME = 'am_global_session';
const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const EXTENDED_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function ensureAuthTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      address TEXT NOT NULL,
      referral_username TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query('ALTER TABLE users ALTER COLUMN phone DROP NOT NULL');
  await query('ALTER TABLE users ALTER COLUMN address DROP NOT NULL');
  await query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12, 2) DEFAULT 0');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_bonus NUMERIC(12, 2) DEFAULT 0');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS bvn TEXT');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nin TEXT');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_pin_hash TEXT');

  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS social_accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_subject TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (provider, provider_subject)
    )
  `);

  await ensureFundingTables();
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash) {
    return false;
  }

  const [salt, originalHash] = storedHash.split(':');

  if (!salt || !originalHash) {
    return false;
  }

  const hashBuffer = scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalHash, 'hex');

  if (hashBuffer.length !== originalBuffer.length) {
    return false;
  }

  return timingSafeEqual(hashBuffer, originalBuffer);
}

export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

export function getSessionMaxAge(rememberMe) {
  return rememberMe ? EXTENDED_SESSION_MAX_AGE : DEFAULT_SESSION_MAX_AGE;
}

export function serializeSessionCookie(token, maxAge) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function createUserSession(userId, rememberMe = false) {
  const token = createSessionToken();
  const maxAge = getSessionMaxAge(rememberMe);

  await query(
    `
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 second'))
    `,
    [userId, token, maxAge]
  );

  return {
    token,
    maxAge,
    cookie: serializeSessionCookie(token, maxAge),
  };
}

export function slugifyUsername(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20);
}

export async function ensureUniqueUsername(baseValue) {
  const base = slugifyUsername(baseValue) || `user${randomBytes(2).toString('hex')}`;
  let candidate = base;
  let counter = 1;

  while (true) {
    const { rows } = await query('SELECT id FROM users WHERE username = $1 LIMIT 1', [candidate]);

    if (!rows.length) {
      return candidate;
    }

    counter += 1;
    candidate = `${base}${counter}`;
  }
}

export async function findOrCreateSocialUser({
  provider,
  providerSubject,
  email,
  fullName,
  profileImage,
}) {
  await ensureAuthTables();

  const socialMatch = await query(
    `
      SELECT users.id, users.full_name, users.username, users.email, users.phone
        , users.wallet_balance, users.referral_bonus, users.profile_image, users.bvn, users.nin
        , users.transaction_pin_hash
      FROM social_accounts
      JOIN users ON users.id = social_accounts.user_id
      WHERE social_accounts.provider = $1 AND social_accounts.provider_subject = $2
      LIMIT 1
    `,
    [provider, providerSubject]
  );

  if (socialMatch.rows.length) {
    return socialMatch.rows[0];
  }

  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Social provider did not return an email address.');
  }

  let user = null;
  const existingUser = await query(
    `
      SELECT id, full_name, username, email, phone
        , wallet_balance, referral_bonus, profile_image, bvn, nin, transaction_pin_hash
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [normalizedEmail]
  );

  if (existingUser.rows.length) {
    user = existingUser.rows[0];
  } else {
    const username = await ensureUniqueUsername(normalizedEmail.split('@')[0] || fullName);
    const createdUser = await query(
      `
        INSERT INTO users (
          full_name,
          username,
          email,
          phone,
          address,
          referral_username,
          password_hash,
          profile_image,
          bvn,
          nin
        )
        VALUES ($1, $2, $3, NULL, NULL, NULL, NULL, $4, NULL, NULL)
        RETURNING id, full_name, username, email, phone, wallet_balance, referral_bonus, profile_image, bvn, nin, transaction_pin_hash
      `,
      [fullName?.trim() || 'AM Global User', username, normalizedEmail, profileImage || null]
    );

    user = createdUser.rows[0];
  }

  if (profileImage && !user.profile_image) {
    const updatedUser = await query(
      `
        UPDATE users
        SET profile_image = $2
        WHERE id = $1
        RETURNING id, full_name, username, email, phone, wallet_balance, referral_bonus, profile_image, bvn, nin, transaction_pin_hash
      `,
      [user.id, profileImage]
    );
    user = updatedUser.rows[0];
  }

  await query(
    `
      INSERT INTO social_accounts (user_id, provider, provider_subject)
      VALUES ($1, $2, $3)
      ON CONFLICT (provider, provider_subject) DO NOTHING
    `,
    [user.id, provider, providerSubject]
  );

  await provisionVirtualAccountForUser({ user });

  return user;
}

export function getSessionTokenFromCookie(cookieHeader = '') {
  const parts = cookieHeader.split(';').map((part) => part.trim());
  const sessionCookie = parts.find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  return sessionCookie ? sessionCookie.slice(SESSION_COOKIE_NAME.length + 1) : null;
}

export async function getUserFromRequest(req) {
  await ensureAuthTables();

  const token = getSessionTokenFromCookie(req.headers.cookie);

  if (!token) {
    return null;
  }

  const { rows } = await query(
    `
      SELECT users.id, users.full_name, users.username, users.email, users.phone
        , users.wallet_balance, users.referral_bonus, users.profile_image, users.bvn, users.nin
        , users.transaction_pin_hash
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token = $1 AND sessions.expires_at > NOW()
      LIMIT 1
    `,
    [token]
  );

  return rows[0] || null;
}

export async function getUserById(userId) {
  await ensureAuthTables();

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const { rows } = await query(
    `
      SELECT id, full_name, username, email, phone, wallet_balance, referral_bonus, profile_image
        , bvn, nin, transaction_pin_hash
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

export function formatNaira(amount) {
  const numericAmount = Number(amount || 0);
  return `₦ ${numericAmount.toLocaleString('en-NG', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}`;
}

export function toSafeUserId(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
