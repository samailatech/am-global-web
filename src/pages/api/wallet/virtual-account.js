import { getServerSession } from 'next-auth/next';

import { authOptions } from '../../../lib/nextAuth';
import { getUserById, getUserFromRequest, toSafeUserId } from '../../../lib/auth';
import { provisionVirtualAccountForUser, getVirtualAccountForUser } from '../../../lib/wallet';

async function resolveCurrentUser(req, res) {
  const nextAuthSession = await getServerSession(req, res, authOptions);
  const nextAuthUserId = toSafeUserId(nextAuthSession?.user?.id);

  if (nextAuthUserId) {
    return getUserById(nextAuthUserId);
  }

  return getUserFromRequest(req);
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const user = await resolveCurrentUser(req, res);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.method === 'GET') {
      const account = await getVirtualAccountForUser(user.id);
      return res.status(200).json({ account });
    }

    const account = await provisionVirtualAccountForUser({
      user,
    });

    return res.status(200).json({
      message:
        account?.status === 'active'
          ? 'Virtual account is ready.'
          : 'Virtual account record created. Complete provider setup to receive a live account number.',
      account,
    });
  } catch (error) {
    console.error('Virtual account error', error);
    return res.status(500).json({ error: error.message || 'Unable to prepare virtual account right now.' });
  }
}
