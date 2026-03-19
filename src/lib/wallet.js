import { query } from './db';
import { createReservedAccountForUser } from './monnify';

function getDbExecutor(client) {
  return client || { query };
}

function normalizeVirtualAccount(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerReference: row.provider_reference,
    bankName: row.bank_name,
    accountName: row.account_name,
    accountNumber: row.account_number,
    status: row.status,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function ensureFundingTables(client) {
  const db = getDbExecutor(client);

  await db.query(`
    CREATE TABLE IF NOT EXISTS virtual_accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'manual',
      provider_reference TEXT UNIQUE,
      bank_name TEXT,
      account_name TEXT,
      account_number TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      virtual_account_id INTEGER REFERENCES virtual_accounts(id) ON DELETE SET NULL,
      provider TEXT NOT NULL,
      provider_reference TEXT UNIQUE,
      entry_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      amount NUMERIC(12, 2) NOT NULL,
      fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'NGN',
      description TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      service TEXT NOT NULL,
      status TEXT NOT NULL,
      amount TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER');
  await db.query(
    'ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
  ).catch(() => null);
}

export async function getVirtualAccountForUser(userId, client) {
  await ensureFundingTables(client);
  const db = getDbExecutor(client);
  const { rows } = await db.query(
    `
      SELECT *
      FROM virtual_accounts
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return normalizeVirtualAccount(rows[0]);
}

export async function getVirtualAccountByAccountNumber(accountNumber, client) {
  if (!accountNumber) {
    return null;
  }

  await ensureFundingTables(client);
  const db = getDbExecutor(client);
  const { rows } = await db.query(
    `
      SELECT *
      FROM virtual_accounts
      WHERE account_number = $1
      LIMIT 1
    `,
    [accountNumber]
  );

  return normalizeVirtualAccount(rows[0]);
}

export async function getVirtualAccountByProviderReference(providerReference, client) {
  if (!providerReference) {
    return null;
  }

  await ensureFundingTables(client);
  const db = getDbExecutor(client);
  const { rows } = await db.query(
    `
      SELECT *
      FROM virtual_accounts
      WHERE provider_reference = $1
      LIMIT 1
    `,
    [providerReference]
  );

  return normalizeVirtualAccount(rows[0]);
}

function buildMockAccountNumber(userId) {
  return String(9000000000 + Number(userId)).slice(0, 10);
}

export async function provisionVirtualAccountForUser({ user, client }) {
  if (!user?.id) {
    return null;
  }

  await ensureFundingTables(client);
  const db = getDbExecutor(client);
  const existingAccount = await getVirtualAccountForUser(user.id, client);
  const provider = (process.env.VIRTUAL_ACCOUNT_PROVIDER || 'manual').toLowerCase();

  if (existingAccount && (provider !== 'monnify' || existingAccount.accountNumber)) {
    return existingAccount;
  }

  const bankName = process.env.DEFAULT_VIRTUAL_BANK_NAME || 'OPay';
  const accountName = `AMGLOBAL.COM.NG - ${user.username || `user${user.id}`}`;

  let createdAccount;

  if (provider === 'mock') {
    const { rows } = await db.query(
      `
        INSERT INTO virtual_accounts (
          user_id,
          provider,
          provider_reference,
          bank_name,
          account_name,
          account_number,
          status,
          metadata,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'active', $7::jsonb, NOW())
        RETURNING *
      `,
      [
        user.id,
        provider,
        `mock-va-${user.id}`,
        bankName,
        accountName,
        buildMockAccountNumber(user.id),
        JSON.stringify({ mode: 'mock' }),
      ]
    );

    createdAccount = rows[0];
  } else if (provider === 'monnify') {
    const monnifyAccount = await createReservedAccountForUser(user);

    if (existingAccount && existingAccount.accountNumber) {
      return existingAccount;
    }

    const metadata = {
      ...(monnifyAccount.raw || {}),
      message: monnifyAccount.message || null,
      reservationReference: monnifyAccount.reservationReference || null,
      bankCode: monnifyAccount.bankCode || null,
    };

    if (existingAccount) {
      const { rows } = await db.query(
        `
          UPDATE virtual_accounts
          SET provider = $2,
              provider_reference = $3,
              bank_name = $4,
              account_name = $5,
              account_number = $6,
              status = $7,
              metadata = $8::jsonb,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [
          existingAccount.id,
          provider,
          monnifyAccount.reservationReference || monnifyAccount.accountReference,
          monnifyAccount.bankName || bankName,
          monnifyAccount.accountName || accountName,
          monnifyAccount.accountNumber,
          monnifyAccount.status === 'active' ? 'active' : 'pending',
          JSON.stringify(metadata),
        ]
      );

      createdAccount = rows[0];
    } else {
      const { rows } = await db.query(
        `
          INSERT INTO virtual_accounts (
            user_id,
            provider,
            provider_reference,
            bank_name,
            account_name,
            account_number,
            status,
            metadata,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
          RETURNING *
        `,
        [
          user.id,
          provider,
          monnifyAccount.reservationReference || monnifyAccount.accountReference,
          monnifyAccount.bankName || bankName,
          monnifyAccount.accountName || accountName,
          monnifyAccount.accountNumber,
          monnifyAccount.status === 'active' ? 'active' : 'pending',
          JSON.stringify(metadata),
        ]
      );

      createdAccount = rows[0];
    }
  } else {
    const { rows } = await db.query(
      `
        INSERT INTO virtual_accounts (
          user_id,
          provider,
          provider_reference,
          bank_name,
          account_name,
          account_number,
          status,
          metadata,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NULL, 'pending', $6::jsonb, NOW())
        RETURNING *
      `,
      [
        user.id,
        provider,
        `${provider}-va-${user.id}`,
        bankName,
        accountName,
        JSON.stringify({
          mode: 'pending-provider-setup',
          message: 'Attach a live virtual account provider to allocate a real account number.',
        }),
      ]
    );

    createdAccount = rows[0];
  }

  return normalizeVirtualAccount(createdAccount);
}

export async function recordWalletCredit({
  userId,
  virtualAccountId,
  provider,
  providerReference,
  amount,
  fee = 0,
  currency = 'NGN',
  description = 'Wallet funding',
  metadata = {},
  client,
}) {
  if (!userId || !provider || !providerReference) {
    throw new Error('userId, provider, and providerReference are required.');
  }

  const numericAmount = Number(amount);
  const numericFee = Number(fee || 0);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Credit amount must be greater than zero.');
  }

  await ensureFundingTables(client);
  const db = getDbExecutor(client);
  const { rows: existingRows } = await db.query(
    `
      SELECT id, amount, fee, status
      FROM wallet_transactions
      WHERE provider_reference = $1
      LIMIT 1
    `,
    [providerReference]
  );

  if (existingRows.length) {
    return {
      duplicated: true,
      transactionId: existingRows[0].id,
      amount: Number(existingRows[0].amount),
      fee: Number(existingRows[0].fee),
      status: existingRows[0].status,
    };
  }

  const { rows: transactionRows } = await db.query(
    `
      INSERT INTO wallet_transactions (
        user_id,
        virtual_account_id,
        provider,
        provider_reference,
        entry_type,
        status,
        amount,
        fee,
        currency,
        description,
        metadata
      )
      VALUES ($1, $2, $3, $4, 'credit', 'completed', $5, $6, $7, $8, $9::jsonb)
      RETURNING id
    `,
    [
      userId,
      virtualAccountId || null,
      provider,
      providerReference,
      numericAmount,
      numericFee,
      currency,
      description,
      JSON.stringify(metadata),
    ]
  );

  const { rows: updatedUserRows } = await db.query(
    `
      UPDATE users
      SET wallet_balance = COALESCE(wallet_balance, 0) + $2
      WHERE id = $1
      RETURNING wallet_balance
    `,
    [userId, numericAmount]
  );

  await db.query(
    `
      INSERT INTO transactions (user_id, service, status, amount)
      VALUES ($1, $2, $3, $4)
    `,
    [
      userId,
      description,
      'Completed',
      `₦${numericAmount.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    ]
  );

  return {
    duplicated: false,
    transactionId: transactionRows[0].id,
    amount: numericAmount,
    fee: numericFee,
    status: 'completed',
    walletBalance: Number(updatedUserRows[0]?.wallet_balance || 0),
  };
}
