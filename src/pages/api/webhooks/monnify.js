import { getClient } from '../../../lib/db';
import { computeMonnifySignature } from '../../../lib/monnify';
import {
  getVirtualAccountByAccountNumber,
  getVirtualAccountByProviderReference,
  recordWalletCredit,
} from '../../../lib/wallet';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const rawBody = await readRawBody(req);
  const providedSignature =
    req.headers['monnify-signature'] || req.headers['x-monnify-signature'] || '';
  const expectedSignature = computeMonnifySignature(rawBody);

  if (!providedSignature || providedSignature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid Monnify signature.' });
  }

  const payload = JSON.parse(rawBody || '{}');
  const eventData = payload.eventData || payload;
  const accountNumber =
    eventData.destinationAccountInformation?.accountNumber ||
    eventData.accountDetails?.accountNumber ||
    eventData.accountNumber ||
    null;
  const accountReference =
    eventData.product?.reference || eventData.accountReference || eventData.paymentReference || null;
  const paymentReference =
    eventData.paymentReference || eventData.transactionReference || eventData.transaction?.reference;
  const amount = eventData.amountPaid || eventData.amount || eventData.paidAmount;
  const fee = eventData.totalPayable ? Number(eventData.totalPayable) - Number(amount || 0) : 0;

  if (!paymentReference || !amount) {
    return res.status(400).json({ error: 'Payment reference and amount are required.' });
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    let virtualAccount = null;

    if (accountNumber) {
      virtualAccount = await getVirtualAccountByAccountNumber(accountNumber, client);
    }

    if (!virtualAccount && accountReference) {
      virtualAccount = await getVirtualAccountByProviderReference(accountReference, client);
    }

    if (!virtualAccount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Virtual account not found for Monnify event.' });
    }

    const credit = await recordWalletCredit({
      userId: virtualAccount.userId,
      virtualAccountId: virtualAccount.id,
      provider: 'monnify',
      providerReference: String(paymentReference),
      amount,
      fee,
      currency: eventData.currency || 'NGN',
      description: eventData.paymentDescription || 'Wallet funding via Monnify',
      metadata: {
        eventType: payload.eventType || null,
        accountNumber,
        accountReference,
      },
      client,
    });

    await client.query(
      `
        UPDATE virtual_accounts
        SET status = 'active',
            updated_at = NOW()
        WHERE id = $1
      `,
      [virtualAccount.id]
    );

    await client.query('COMMIT');
    return res.status(200).json({
      message: credit.duplicated ? 'Monnify event already processed.' : 'Wallet credited successfully.',
      credit,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Monnify webhook error', error);
    return res.status(500).json({ error: 'Unable to process Monnify webhook.' });
  } finally {
    client.release();
  }
}
