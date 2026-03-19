import { Buffer } from 'buffer';
import { createHmac } from 'crypto';

function getMonnifyBaseUrl() {
  if (process.env.MONNIFY_BASE_URL) {
    return process.env.MONNIFY_BASE_URL;
  }

  const apiKey = process.env.MONNIFY_API_KEY || '';
  return apiKey.startsWith('MK_PROD_') ? 'https://api.monnify.com' : 'https://sandbox.monnify.com';
}

function getBasicAuthValue() {
  const apiKey = process.env.MONNIFY_API_KEY || '';
  const secretKey = process.env.MONNIFY_SECRET_KEY || '';

  if (!apiKey || !secretKey) {
    throw new Error('Monnify credentials are not configured.');
  }

  return `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString('base64')}`;
}

async function parseMonnifyResponse(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.requestSuccessful) {
    const message =
      payload?.responseMessage || payload?.message || 'Monnify request failed unexpectedly.';
    throw new Error(message);
  }

  return payload.responseBody;
}

function normalizeReservedAccountResponse(responseBody, accountReference) {
  const account = responseBody?.accounts?.[0] || null;

  return {
    status: responseBody?.status?.toLowerCase() || 'active',
    accountReference: responseBody?.accountReference || accountReference,
    reservationReference: responseBody?.reservationReference || null,
    accountNumber: account?.accountNumber || responseBody?.accountNumber || null,
    accountName: account?.accountName || responseBody?.accountName || null,
    bankName: account?.bankName || responseBody?.bankName || null,
    bankCode: account?.bankCode || responseBody?.bankCode || null,
    raw: responseBody,
  };
}

export async function getMonnifyAccessToken() {
  const response = await fetch(`${getMonnifyBaseUrl()}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthValue(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const body = await parseMonnifyResponse(response);
  return body.accessToken;
}

export function buildMonnifyAccountReference(user) {
  return `amglobal-user-${user.id}`;
}

export async function createReservedAccountForUser(user) {
  if (!user?.id || !user?.email || !user?.full_name || (!user?.bvn && !user?.nin)) {
    return {
      status: 'pending_kyc',
      accountReference: buildMonnifyAccountReference(user || { id: 'pending' }),
      message: 'BVN or NIN is required before Monnify can allocate a reserved account.',
    };
  }

  const accessToken = await getMonnifyAccessToken();
  const accountReference = buildMonnifyAccountReference(user);
  const detailsResponse = await fetch(
    `${getMonnifyBaseUrl()}/api/v2/bank-transfer/reserved-accounts/${accountReference}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (detailsResponse.ok) {
    const existingBody = await parseMonnifyResponse(detailsResponse);
    return normalizeReservedAccountResponse(existingBody, accountReference);
  }

  const response = await fetch(`${getMonnifyBaseUrl()}/api/v2/bank-transfer/reserved-accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accountReference,
      accountName: `AMGLOBAL.COM.NG - ${user.username}`,
      currencyCode: 'NGN',
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      customerEmail: user.email,
      customerName: user.full_name,
      bvn: user.bvn || undefined,
      nin: user.nin || undefined,
      getAllAvailableBanks: true,
    }),
  });

  const responseBody = await parseMonnifyResponse(response);
  return normalizeReservedAccountResponse(responseBody, accountReference);
}

export function computeMonnifySignature(rawBody) {
  return createHmac('sha512', process.env.MONNIFY_SECRET_KEY || '').update(rawBody).digest('hex');
}
