import { getClient } from '../../../lib/db';
import { getVirtualAccountByAccountNumber, recordWalletCredit } from '../../../lib/wallet';

function getWebhookSecret(req) {
  return req.headers['x-wallet-webhook-secret'] || req.headers['x-webhook-secret'] || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.WALLET_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Webhook secret is not configured.' });
  }

  if (getWebhookSecret(req) !== process.env.WALLET_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  const {
    provider = process.env.VIRTUAL_ACCOUNT_PROVIDER || 'manual',
    providerReference,
    accountNumber,
    amount,
    fee,
    currency,
    narration,
    metadata,
  } = req.body || {};

  if (!providerReference || !accountNumber || !amount) {
    return res.status(400).json({
      error: 'providerReference, accountNumber, and amount are required.',
    });
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const virtualAccount = await getVirtualAccountByAccountNumber(accountNumber, client);

    if (!virtualAccount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Virtual account not found.' });
    }

    const credit = await recordWalletCredit({
      userId: virtualAccount.userId,
      virtualAccountId: virtualAccount.id,
      provider,
      providerReference,
      amount,
      fee,
      currency: currency || 'NGN',
      description: narration || 'Wallet funding via virtual account',
      metadata: {
        ...(metadata || {}),
        accountNumber,
      },
      client,
    });

    await client.query(
      `
        UPDATE virtual_accounts
        SET status = CASE
          WHEN status = 'pending' THEN 'active'
          ELSE status
        END,
        updated_at = NOW()
        WHERE id = $1
      `,
      [virtualAccount.id]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      message: credit.duplicated ? 'Credit already processed.' : 'Wallet credited successfully.',
      credit,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Virtual account webhook error', error);
    return res.status(500).json({ error: 'Unable to process funding webhook.' });
  } finally {
    client.release();
  }
}
