import { getServerSession } from 'next-auth/next';

import { authOptions } from '../../../lib/nextAuth';
import {
  ensureAuthTables,
  getUserById,
  getUserFromRequest,
  hashPassword,
  toSafeUserId,
  verifyPassword,
} from '../../../lib/auth';
import { query } from '../../../lib/db';

async function resolveCurrentUser(req, res) {
  const nextAuthSession = await getServerSession(req, res, authOptions);
  const nextAuthUserId = toSafeUserId(nextAuthSession?.user?.id);

  if (nextAuthUserId) {
    return getUserById(nextAuthUserId);
  }

  return getUserFromRequest(req);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  await ensureAuthTables();
  const user = await resolveCurrentUser(req, res);

  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { action, pin, confirmPin } = req.body || {};

  if (!/^\d{4}$/.test(pin || '')) {
    return res.status(400).json({ error: 'Transaction pin must be exactly 4 digits.' });
  }

  if (action === 'set') {
    if (pin !== confirmPin) {
      return res.status(400).json({ error: 'Transaction pin confirmation does not match.' });
    }

    const pinHash = hashPassword(pin);
    await query('UPDATE users SET transaction_pin_hash = $2 WHERE id = $1', [user.id, pinHash]);
    return res.status(200).json({ message: 'Transaction pin created successfully.' });
  }

  if (!user.transaction_pin_hash) {
    return res.status(400).json({ error: 'No transaction pin has been created for this account yet.' });
  }

  if (!verifyPassword(pin, user.transaction_pin_hash)) {
    return res.status(401).json({ error: 'Invalid transaction pin.' });
  }

  return res.status(200).json({ message: 'Transaction pin verified successfully.' });
}
