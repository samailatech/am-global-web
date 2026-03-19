import { getServerSession } from 'next-auth/next';

import { formatNaira, getUserById, getUserFromRequest, toSafeUserId } from '../../lib/auth';
import { authOptions } from '../../lib/nextAuth';
import { query } from '../../lib/db';
import { provisionVirtualAccountForUser } from '../../lib/wallet';

const fallbackTransactions = [
  { id: 'mtn-2500', label: 'MTN data bundle', status: 'Completed', amount: '₦2,500' },
  { id: 'tv-5400', label: 'Cable TV renewal', status: 'In progress', amount: '₦5,400' },
  { id: 'electric-25000', label: 'Electricity bill', status: 'Paid', amount: '₦25,000' },
];

export default async function handler(req, res) {
  try {
    const nextAuthSession = await getServerSession(req, res, authOptions);
    let currentUser = null;

    const nextAuthUserId = toSafeUserId(nextAuthSession?.user?.id);

    if (nextAuthUserId) {
      currentUser = await getUserById(nextAuthUserId);
    } else {
      currentUser = await getUserFromRequest(req);
    }

    let virtualAccount = null;

    if (currentUser) {
      try {
        virtualAccount = await provisionVirtualAccountForUser({
          user: currentUser,
        });
      } catch (virtualAccountError) {
        console.error('Virtual account provisioning error', virtualAccountError);
      }
    }

    let transactionResult;

    try {
      transactionResult = await query(
        `
          SELECT service, status, amount
          FROM transactions
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 5
        `,
        [currentUser?.id || 0]
      );
    } catch (transactionError) {
      if (transactionError?.code === '42703') {
        transactionResult = await query(`
          SELECT service, status, amount
          FROM transactions
          ORDER BY created_at DESC
          LIMIT 5
        `);
      } else {
        throw transactionError;
      }
    }

    const transactions = transactionResult.rows.length
      ? transactionResult.rows.map((row) => ({
          id: `${row.service}-${row.amount}`,
          label: row.service,
          status: row.status,
          amount: row.amount,
        }))
      : fallbackTransactions;

    const referralCountResult = await query(
      `
        SELECT COUNT(*)::INTEGER AS total
        FROM users
        WHERE referral_username = $1
      `,
      [currentUser?.username || '']
    );

    const totalReferrals = referralCountResult.rows[0]?.total || 0;
    const walletTotalsResult = await query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN entry_type = 'credit' AND status = 'completed' THEN amount ELSE 0 END), 0) AS total_funding,
          COALESCE(SUM(CASE WHEN entry_type = 'debit' AND status = 'completed' THEN amount ELSE 0 END), 0) AS total_spent
        FROM wallet_transactions
        WHERE user_id = $1
      `,
      [currentUser?.id || 0]
    );

    const totalFunding = Number(walletTotalsResult.rows[0]?.total_funding || 0);
    const totalSpent = Number(walletTotalsResult.rows[0]?.total_spent || 0);
    const supportNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '';
    const supportWhatsappUrl = supportNumber
      ? `https://wa.me/${supportNumber.replace(/\D/g, '')}`
      : null;

    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=59');
    res.json({
      balance: formatNaira(currentUser?.wallet_balance ?? 0),
      subtitle: 'Modern telecom subscription control center',
      referrals: {
        total: formatNaira(currentUser?.referral_bonus ?? 0),
        status: totalReferrals ? `${totalReferrals} referral${totalReferrals === 1 ? '' : 's'}` : 'No referrals yet',
      },
      accountStats: {
        walletBalance: formatNaira(currentUser?.wallet_balance ?? 0),
        referralBonus: formatNaira(currentUser?.referral_bonus ?? 0),
        totalReferrals,
      },
      transactionStats: {
        walletBalance: formatNaira(currentUser?.wallet_balance ?? 0),
        totalFunding: formatNaira(totalFunding),
        totalSpent: formatNaira(totalSpent),
      },
      notifications: {
        title: 'Notifications',
        body: 'Your wallet, referrals, and reserved account updates will appear here as you progress.',
      },
      faqs: {
        title: 'FAQs',
        body: 'Please go through them to have a better knowledge of this platform',
      },
      support: {
        title: 'Support Team',
        body: 'Have anything to say to us? Please contact our Support Team on Whatsapp',
        whatsappUrl: supportWhatsappUrl,
      },
      quickActions: ['Buy Data', 'Buy Airtime', 'Cable TV', 'Electricity'],
      promo: { title: 'Launch data bundles', subtitle: 'Feature promo and referral.' },
      autoRenewal: 'Scheduled for next billing cycle',
      transactions,
      virtualAccount: virtualAccount
        ? {
            ...virtualAccount,
            fundingReady: virtualAccount.status === 'active' && Boolean(virtualAccount.accountNumber),
          }
        : null,
    });
  } catch (error) {
    console.error('Dashboard error', error);
    res.status(500).json({ error: 'Unable to fetch dashboard data.' });
  }
}
