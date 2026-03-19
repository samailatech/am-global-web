import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());
const sidebarItems = [
  { label: 'Dashboard', icon: 'grid' },
  { label: 'Buy Data', icon: 'wifi' },
  { label: 'Buy Airtime', icon: 'phone' },
  { label: 'Fund Wallet', icon: 'wallet' },
  { label: 'Pricing', icon: 'tag' },
  { label: 'F.A.Qs', icon: 'help' },
  { label: 'Account', icon: 'user' },
  { label: 'Change Pin', icon: 'lock' },
  { label: 'Setting', icon: 'settings' },
  { label: "Developer's API", icon: 'code' },
  { label: 'Logout', icon: 'logout', action: 'logout' },
];

function SidebarIcon({ type }) {
  const icons = {
    grid: (
      <path
        d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
        fill="currentColor"
      />
    ),
    wifi: (
      <path
        d="M12 18.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0-4.5a5.3 5.3 0 0 1 3.77 1.56l1.42-1.42A7.3 7.3 0 0 0 12 12a7.3 7.3 0 0 0-5.19 2.14l1.42 1.42A5.3 5.3 0 0 1 12 14Zm0-4.5c3.18 0 6.16 1.24 8.41 3.49l1.41-1.41A13.85 13.85 0 0 0 12 7 13.85 13.85 0 0 0 2.18 11.58l1.41 1.41A11.85 11.85 0 0 1 12 9.5Z"
        fill="currentColor"
      />
    ),
    phone: (
      <path
        d="M7.05 4.5h2.1l1.05 4.2-1.58 1.57a15.1 15.1 0 0 0 5.1 5.1l1.58-1.57 4.2 1.05v2.1A1.55 1.55 0 0 1 17.95 18 13.45 13.45 0 0 1 4.5 4.55 1.55 1.55 0 0 1 6.05 3h1Z"
        fill="currentColor"
      />
    ),
    wallet: (
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h10A2.5 2.5 0 0 1 19 7.5V8h1v8.5A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9ZM6.5 6.5a1 1 0 0 0-1 1V8h11V7.5a1 1 0 0 0-1-1h-9Zm11 6a1 1 0 1 0 0 2h1v-2h-1Z"
        fill="currentColor"
      />
    ),
    tag: (
      <path
        d="m12.5 3 8.5 8.5-7.5 7.5L5 10.5V3h7.5Zm-4 3a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 8.5 6Z"
        fill="currentColor"
      />
    ),
    help: (
      <path
        d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 13.75a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm0-10.25a3.5 3.5 0 0 0-3.5 3.5h2A1.5 1.5 0 1 1 12 11.5c-.83 0-1.5.67-1.5 1.5v1h2v-.74A3.5 3.5 0 1 0 12 6.5Z"
        fill="currentColor"
      />
    ),
    user: (
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.31 0-6 2.24-6 5v1h12v-1c0-2.76-2.69-5-6-5Z"
        fill="currentColor"
      />
    ),
    lock: (
      <path
        d="M8 10V8a4 4 0 1 1 8 0v2h1.5A1.5 1.5 0 0 1 19 11.5v7A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-7A1.5 1.5 0 0 1 6.5 10H8Zm2 0h4V8a2 2 0 1 0-4 0v2Z"
        fill="currentColor"
      />
    ),
    settings: (
      <path
        d="m19.14 12.94.04-.94-.04-.94 1.82-1.42-1.72-2.98-2.22.9a7.63 7.63 0 0 0-1.64-.94L15 3h-6l-.38 2.62c-.57.23-1.12.54-1.64.94l-2.22-.9-1.72 2.98 1.82 1.42-.04.94.04.94-1.82 1.42 1.72 2.98 2.22-.9c.52.4 1.07.71 1.64.94L9 21h6l.38-2.62c.57-.23 1.12-.54 1.64-.94l2.22.9 1.72-2.98-1.82-1.42ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
        fill="currentColor"
      />
    ),
    code: (
      <path
        d="m8.5 7-5 5 5 5 1.4-1.4L6.3 12l3.6-3.6L8.5 7Zm7 0-1.4 1.4 3.6 3.6-3.6 3.6 1.4 1.4 5-5-5-5Z"
        fill="currentColor"
      />
    ),
    receipt: (
      <path
        d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21V3Zm3 4v2h4V7h-4Zm-1 5h6v-2H9v2Zm0 3h6v-2H9v2Z"
        fill="currentColor"
      />
    ),
    chart: (
      <path
        d="M5 19h14v2H3V5h2v14Zm2-3h2V9H7v7Zm4 0h2V6h-2v10Zm4 0h2v-4h-2v4Z"
        fill="currentColor"
      />
    ),
    rocket: (
      <path
        d="M14.5 3c-3.9.4-6.73 2.61-8.49 6.63L3 13l4 .5 3.5 3.5.5 4 3.37-3.01C18.39 16.23 20.6 13.4 21 9.5L14.5 3ZM9 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z"
        fill="currentColor"
      />
    ),
    gift: (
      <path
        d="M20 7h-2.18A3 3 0 0 0 12 5.64 3 3 0 0 0 6.18 7H4a1 1 0 0 0-1 1v3h1v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9h1V8a1 1 0 0 0-1-1ZM9 5.5A1.5 1.5 0 1 1 9 8H7.56A1.5 1.5 0 0 1 9 5.5ZM5 9h6v2H5V9Zm1 4h5v6H6v-6Zm7 6v-6h5v6h-5Zm6-8h-6V9h6v2Zm-2.56-3H15a1.5 1.5 0 1 1 1.44-2.5A1.5 1.5 0 0 1 18 7Z"
        fill="currentColor"
      />
    ),
    crown: (
      <path
        d="M4 18h16l-1.5-9-4.5 3-2-5-2 5-4.5-3L4 18Zm0 2h16v2H4v-2Z"
        fill="currentColor"
      />
    ),
    bolt: (
      <path
        d="M13 2 5 13h5l-1 9 8-11h-5l1-9Z"
        fill="currentColor"
      />
    ),
    tv: (
      <path
        d="M7 4h10l-2 3h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4L7 4Zm-2 5v8h14V9H5Z"
        fill="currentColor"
      />
    ),
    refresh: (
      <path
        d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-4.9 6h-2.02A7 7 0 1 0 17.65 6.35Z"
        fill="currentColor"
      />
    ),
    message: (
      <path
        d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 3v-3H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 4v2h12V8H6Zm0 4v2h8v-2H6Z"
        fill="currentColor"
      />
    ),
    printer: (
      <path
        d="M7 3h10v4H7V3Zm11 6a3 3 0 0 1 3 3v5h-4v4H7v-4H3v-5a3 3 0 0 1 3-3h12Zm-3 10v-5H9v5h6Zm2-6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill="currentColor"
      />
    ),
    team: (
      <path
        d="M16 11a3 3 0 1 0-2.99-3A3 3 0 0 0 16 11Zm-8 0A3 3 0 1 0 5.01 8 3 3 0 0 0 8 11Zm0 2c-2.67 0-8 1.34-8 4v3h10v-3a4.77 4.77 0 0 1 1.94-3.78A13.2 13.2 0 0 0 8 13Zm8 0c-.29 0-.62.02-.97.05A4.91 4.91 0 0 1 18 17v3h6v-3c0-2.66-5.33-4-8-4Z"
        fill="currentColor"
      />
    ),
    menu: (
      <path
        d="M4 7h16v2H4V7Zm0 4h16v2H4v-2Zm0 4h16v2H4v-2Z"
        fill="currentColor"
      />
    ),
    dots: (
      <path
        d="M6 12a2 2 0 1 0 0-.01V12Zm6 0a2 2 0 1 0 0-.01V12Zm6 0a2 2 0 1 0 0-.01V12Z"
        fill="currentColor"
      />
    ),
    logout: (
      <path
        d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10v-2H6V6h4V4Zm4.59 4.59L16.17 10H9v4h7.17l-1.58 1.41L16 17l4-4-4-4-1.41 1.59Z"
        fill="currentColor"
      />
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[type] || icons.grid}
    </svg>
  );
}

function getUserInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AG';
}

function formatNaira(amount) {
  const numericAmount = Number(amount || 0);
  return `₦ ${numericAmount.toLocaleString('en-NG', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}`;
}

export default function Dashboard({ user }) {
  const router = useRouter();
  const serviceShortcuts = [
    { label: 'Airtime TopUp', icon: 'phone' },
    { label: 'Buy Data', icon: 'wifi' },
    { label: 'Airtime to cash', icon: 'refresh' },
    { label: 'Electricity Bills', icon: 'bolt' },
    { label: 'Cable Subscription', icon: 'tv' },
    { label: 'Bonus to wallet', icon: 'gift' },
    { label: 'Bulk SMS', icon: 'message' },
    { label: 'Result Checker', icon: 'help' },
    { label: 'Recharge card Printing', icon: 'printer' },
    { label: 'My Referrals', icon: 'team' },
  ];
  const referralLink = `https://amglobal.com.ng/signup/?referal=${user.username}`;
  const { data, error, mutate } = useSWR('/api/dashboard', fetcher, {
    refreshInterval: 10000,
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isGeneratingAccount, setIsGeneratingAccount] = useState(false);
  const [copyState, setCopyState] = useState('copy');
  const [utilityMessage, setUtilityMessage] = useState('');
  const [hasTransactionPin, setHasTransactionPin] = useState(user.hasTransactionPin);
  const [isSidebarCompact, setIsSidebarCompact] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinMode, setPinMode] = useState(user.hasTransactionPin ? 'verify' : 'create');
  const [pendingSidebarAction, setPendingSidebarAction] = useState('');
  const [pinForm, setPinForm] = useState({ pin: '', confirmPin: '' });
  const [pinError, setPinError] = useState('');
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      if (user.authProvider === 'google') {
        await signOut({ callbackUrl: '/login', redirect: true });
        return;
      }

      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      if (user.authProvider !== 'google') {
        await router.push('/login');
      }
    }
  };

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('copy'), 1800);
    } catch (error) {
      setCopyState('copy failed');
      window.setTimeout(() => setCopyState('copy'), 1800);
    }
  };

  const handleGenerateAccount = async () => {
    setIsGeneratingAccount(true);

    try {
      const response = await fetch('/api/wallet/virtual-account', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Unable to generate account');
      }

      await mutate();
    } catch (generationError) {
      console.error('Generate account error', generationError);
    } finally {
      setIsGeneratingAccount(false);
    }
  };

  const handleShortcutClick = (label) => {
    setUtilityMessage(`${label} will be available from this dashboard panel as soon as its transaction flow is connected.`);
  };

  const openPinModal = (label) => {
    setPendingSidebarAction(label);
    setPinMode(hasTransactionPin ? 'verify' : 'create');
    setPinForm({ pin: '', confirmPin: '' });
    setPinError('');
    setIsPinModalOpen(true);
  };

  const handleSidebarAction = async (item) => {
    if (item.action === 'logout') {
      await handleLogout();
      return;
    }

    openPinModal(item.label);
  };

  const closePinModal = () => {
    setIsPinModalOpen(false);
    setPinForm({ pin: '', confirmPin: '' });
    setPinError('');
    setPendingSidebarAction('');
  };

  const handlePinInputChange = (event) => {
    const { name, value } = event.target;
    const sanitizedValue = value.replace(/\D/g, '').slice(0, 4);

    setPinForm((current) => ({
      ...current,
      [name]: sanitizedValue,
    }));
  };

  const handlePinSubmit = async (event) => {
    event.preventDefault();
    setPinError('');
    setIsSubmittingPin(true);

    try {
      const response = await fetch('/api/auth/transaction-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: pinMode === 'create' ? 'set' : 'verify',
          pin: pinForm.pin,
          confirmPin: pinForm.confirmPin,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to process transaction pin.');
      }

      setUtilityMessage(`${pendingSidebarAction} unlocked. Transaction pin accepted.`);
      setHasTransactionPin(true);
      closePinModal();
    } catch (pinSubmitError) {
      setPinError(pinSubmitError.message);
    } finally {
      setIsSubmittingPin(false);
    }
  };

  if (error) return <div className="container">Failed to load dashboard</div>;
  if (!data) return <div className="container">Loading dashboard...</div>;

  const virtualAccount = data.virtualAccount;
  const accountBankName = virtualAccount?.bankName || 'OPay';
  const accountStatus =
    virtualAccount?.status === 'active' && virtualAccount?.accountNumber ? 'Auto Credit' : 'Pending';
  const accountNumber = virtualAccount?.accountNumber || 'Awaiting live provider allocation';
  const accountName = virtualAccount?.accountName || `AMGLOBAL.COM.NG - ${user.username}`;
  const accountHelperText =
    virtualAccount?.fundingReady
      ? 'Transfer into this reserved account to credit the user wallet automatically through the funding webhook.'
      : virtualAccount?.metadata?.message ||
        'This account record is ready, but a live provider still needs to be connected before a real bank account number can be issued.';
  const accountStats = data.accountStats || {
    walletBalance: data.balance,
    referralBonus: '₦ 0.0',
    totalReferrals: 0,
  };
  const transactionStats = data.transactionStats || {
    walletBalance: data.balance,
    totalFunding: '₦ 0.0',
    totalSpent: '₦ 0.0',
  };
  const whatsappLink = data.support?.whatsappUrl || null;

  return (
    <div className={`dashboard-shell${isSidebarCompact ? ' sidebar-compact' : ''}`}>
      <aside className={`dashboard-sidebar${isSidebarCompact ? ' compact' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand-row">
            <button
              className="sidebar-toggle-btn"
              type="button"
              onClick={() => setIsSidebarCompact((current) => !current)}
              aria-label={isSidebarCompact ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <SidebarIcon type={isSidebarCompact ? 'dots' : 'menu'} />
            </button>
          </div>
          <div className="sidebar-copy">
            <p className="sidebar-eyebrow">Welcome</p>
            <h2>{user.full_name}</h2>
          </div>
        </div>

        <div className="sidebar-balance">
          <div className="sidebar-profile">
            {user.profile_image ? (
              <img
                src={user.profile_image}
                alt={`${user.full_name} profile`}
                className="sidebar-avatar"
              />
            ) : (
              <div className="sidebar-avatar sidebar-avatar-fallback">{getUserInitials(user.full_name)}</div>
            )}
            <div>
              <p className="sidebar-user-name">{user.username}</p>
              <p className="sidebar-muted">balance: {formatNaira(user.wallet_balance)}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              className={`sidebar-link${item.label === 'Dashboard' ? ' active' : ''}`}
              type="button"
              onClick={() => handleSidebarAction(item)}
              disabled={item.action === 'logout' && isLoggingOut}
            >
              <SidebarIcon type={item.icon} />
              <span className="sidebar-link-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <p className="sidebar-version">
          <span className="sidebar-version-label">Version 9.6</span>
        </p>
      </aside>

      <div className="dashboard-home">
        <div className="dashboard-topbar">
          <button className="topbar-logout" onClick={handleLogout} disabled={isLoggingOut}>
            <SidebarIcon type="logout" />
            <span>{isLoggingOut ? 'Signing out...' : 'Logout'}</span>
          </button>
        </div>
        <header className="dash-hero">
          <div className="dash-hero-main">
            <p className="hero-kicker">Welcome to AMGLOBAL.COM.NG</p>
            <h1>Welcome to AMGLOBAL.COM.NG</h1>
            <p>
              We offer you the most affordable and most cheapest data, airtime, Dstv, Gotv and
              Startimes subscription.
            </p>
            <p>
              Here is the right place for your Electricity subscription and also Convert your
              Airtime to Cash.
            </p>
            <div className="referral-banner">
              <span>Referal Link: {referralLink}</span>
              <button className="ghost-btn referral-copy" type="button" onClick={handleCopyReferral}>
                {copyState}
              </button>
            </div>
          </div>
          <div className="dash-hero-side">
            <button className="topbar-fund-wallet hero-fund-wallet" type="button">
              <SidebarIcon type="wallet" />
              <span>Fund Wallet</span>
            </button>
          </div>
        </header>

        <section className="wallet-notice-strip">
          <div className="wallet-notice-card">
            <div className="wallet-notice-head">
              <p className="wallet-greeting">
                Good morning, <strong>{user.username}</strong>
              </p>
              <button className="wallet-link-action" type="button">
                app download
              </button>
            </div>

            <div className="wallet-package-row">
              <h3>Package : Smart Earner</h3>
            </div>

            <div className="wallet-announcement-bar">
              <p className="wallet-announcement-text">
                <strong>**NEW**</strong> Own a AMGLOBAL.COM.NG retailer website and retail all our
                services; Such as DATA, Recharge cards printing, AIRTIME and BILLS Payment.
              </p>
              <button className="wallet-click-btn" type="button">
                Click Here
              </button>
            </div>
            <div className="wallet-generate-row">
              <button
                className="wallet-generate-btn"
                type="button"
                onClick={handleGenerateAccount}
                disabled={isGeneratingAccount}
              >
                {isGeneratingAccount ? 'Generating account...' : 'Generate Account number click here'}
              </button>
            </div>

            <div className="wallet-opay-card">
              <div className="wallet-opay-head">
                <div>
                  <p className="wallet-opay-label">{accountBankName}</p>
                  <h4>Reserved Funding Account</h4>
                </div>
                <span className="wallet-opay-badge">{accountStatus}</span>
              </div>

              <div className="wallet-opay-details">
                <div className="wallet-opay-item">
                  <span>Account Number</span>
                  <strong>{accountNumber}</strong>
                </div>
                <div className="wallet-opay-item">
                  <span>Account Name</span>
                  <strong>{accountName}</strong>
                </div>
                <div className="wallet-opay-item">
                  <span>Bank Name</span>
                  <strong>{accountBankName}</strong>
                </div>
              </div>

              <p className="wallet-opay-note">
                {accountHelperText}
              </p>
            </div>

            <div className="wallet-summary-grid">
              <div className="wallet-summary-tile">
                <span className="wallet-summary-icon">
                  <SidebarIcon type="receipt" />
                </span>
                <span className="wallet-summary-label">Transactions</span>
              </div>
              <div className="wallet-summary-tile">
                <span className="wallet-summary-icon">
                  <SidebarIcon type="chart" />
                </span>
                <span className="wallet-summary-label">Wallet summary</span>
              </div>
              <div className="wallet-summary-tile wallet-summary-upgrade">
                <span className="wallet-summary-icon">
                  <SidebarIcon type="rocket" />
                </span>
                <span className="wallet-summary-label">Upgrade to Affilliate</span>
                <strong>₦2,000</strong>
              </div>
              <div className="wallet-summary-tile wallet-summary-upgrade">
                <span className="wallet-summary-icon">
                  <SidebarIcon type="crown" />
                </span>
                <span className="wallet-summary-label">Upgrade to Topuser</span>
                <strong>₦5,000</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="wallet-progress-grid">
          <div className="wallet-progress-card">
            <span className="wallet-progress-icon">
              <SidebarIcon type="wallet" />
            </span>
            <span className="wallet-progress-label">Wallet Balance</span>
            <strong>{accountStats.walletBalance}</strong>
          </div>
          <div className="wallet-progress-card">
            <span className="wallet-progress-icon">
              <SidebarIcon type="gift" />
            </span>
            <span className="wallet-progress-label">Referral Bonus</span>
            <strong>{accountStats.referralBonus}</strong>
          </div>
          <div className="wallet-progress-card">
            <span className="wallet-progress-icon">
              <SidebarIcon type="user" />
            </span>
            <span className="wallet-progress-label">My Total Referral</span>
            <strong>{accountStats.totalReferrals}</strong>
          </div>
        </section>

        <section className="dashboard-utility-section">
          <div className="dashboard-utility-grid">
            <article className="dashboard-utility-card">
              <span className="dashboard-utility-icon">
                <SidebarIcon type="message" />
              </span>
              <h3>{data.notifications.title}</h3>
              <p>{data.notifications.body}</p>
            </article>
            <article className="dashboard-utility-card">
              <span className="dashboard-utility-icon">
                <SidebarIcon type="help" />
              </span>
              <h3>{data.faqs.title}</h3>
              <p>{data.faqs.body}</p>
              <button
                className="utility-link-btn"
                type="button"
                onClick={() => setUtilityMessage('FAQs section opened. We can wire this to a full FAQ page next.')}
              >
                Read FAQs
              </button>
            </article>
            <article className="dashboard-utility-card">
              <span className="dashboard-utility-icon">
                <SidebarIcon type="phone" />
              </span>
              <h3>{data.support.title}</h3>
              <p>{data.support.body}</p>
              {data.support.whatsappUrl ? (
                <a
                  className="utility-link-btn"
                  href={data.support.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open WhatsApp
                </a>
              ) : (
                <button
                  className="utility-link-btn disabled"
                  type="button"
                  onClick={() =>
                    setUtilityMessage('Add NEXT_PUBLIC_SUPPORT_WHATSAPP in .env.local to enable WhatsApp support.')
                  }
                >
                  Support Pending
                </button>
              )}
            </article>
          </div>

          <div className="dashboard-service-grid">
            {serviceShortcuts.map((item) => (
              <button
                key={item.label}
                className="dashboard-service-card"
                type="button"
                onClick={() => handleShortcutClick(item.label)}
              >
                <span className="dashboard-service-icon">
                  <SidebarIcon type={item.icon} />
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {utilityMessage ? <p className="dashboard-utility-message">{utilityMessage}</p> : null}

          <div className="transaction-stat-section">
            <h3>TRANSACTION STATISTICS</h3>
            <div className="transaction-stat-grid">
              <div className="transaction-stat-card">
                <span className="transaction-stat-label">WALLET BALANCE</span>
                <strong>{transactionStats.walletBalance}</strong>
              </div>
              <div className="transaction-stat-card">
                <span className="transaction-stat-label">TOTAL FUNDING</span>
                <strong>{transactionStats.totalFunding}</strong>
              </div>
              <div className="transaction-stat-card">
                <span className="transaction-stat-label">TOTAL SPENT</span>
                <strong>{transactionStats.totalSpent}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="footer-banner">
          <h3>Auto renew</h3>
          <p>{data.autoRenewal}</p>
        </section>
      </div>

      {whatsappLink ? (
        <a
          className="floating-whatsapp"
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          aria-label="Message support on WhatsApp"
        >
          <span className="floating-whatsapp__icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M20.52 3.48A11.9 11.9 0 0 0 12.06 0C5.46 0 .1 5.35.1 11.95c0 2.1.55 4.15 1.6 5.95L0 24l6.27-1.64a11.93 11.93 0 0 0 5.79 1.48h.01c6.59 0 11.95-5.36 11.95-11.95 0-3.19-1.24-6.18-3.5-8.41ZM12.07 21.8h-.01a9.9 9.9 0 0 1-5.05-1.39l-.36-.21-3.72.98 1-3.62-.24-.37a9.88 9.88 0 0 1-1.52-5.24c0-5.47 4.45-9.92 9.92-9.92 2.65 0 5.14 1.03 7.01 2.9a9.85 9.85 0 0 1 2.9 7.01c0 5.47-4.45 9.92-9.93 9.92Zm5.44-7.42c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.67.15s-.77.98-.94 1.18c-.17.2-.35.22-.65.08-.3-.15-1.28-.47-2.43-1.48-.9-.8-1.5-1.78-1.67-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37s-1.05 1.03-1.05 2.5 1.08 2.89 1.23 3.09c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.49 1.72.63.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.07-.12-.27-.2-.57-.35Z"
              />
            </svg>
          </span>
          <span className="floating-whatsapp__label">Message us</span>
        </a>
      ) : (
        <button
          className="floating-whatsapp floating-whatsapp--disabled"
          type="button"
          onClick={() =>
            setUtilityMessage('Add NEXT_PUBLIC_SUPPORT_WHATSAPP in .env.local to enable the floating WhatsApp button.')
          }
        >
          <span className="floating-whatsapp__icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M20.52 3.48A11.9 11.9 0 0 0 12.06 0C5.46 0 .1 5.35.1 11.95c0 2.1.55 4.15 1.6 5.95L0 24l6.27-1.64a11.93 11.93 0 0 0 5.79 1.48h.01c6.59 0 11.95-5.36 11.95-11.95 0-3.19-1.24-6.18-3.5-8.41ZM12.07 21.8h-.01a9.9 9.9 0 0 1-5.05-1.39l-.36-.21-3.72.98 1-3.62-.24-.37a9.88 9.88 0 0 1-1.52-5.24c0-5.47 4.45-9.92 9.92-9.92 2.65 0 5.14 1.03 7.01 2.9a9.85 9.85 0 0 1 2.9 7.01c0 5.47-4.45 9.92-9.93 9.92Z"
              />
            </svg>
          </span>
          <span className="floating-whatsapp__label">Message us</span>
        </button>
      )}

      {isPinModalOpen ? (
        <div className="pin-modal-overlay" role="presentation" onClick={closePinModal}>
          <div
            className="pin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-pin-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="transaction-pin-title">
              {pinMode === 'create' ? 'Create Transaction Pin' : 'Enter Transaction Pin'}
            </h3>
            <p>
              {pinMode === 'create'
                ? `Create a 4-digit transaction pin before using ${pendingSidebarAction}.`
                : `Provide your 4-digit transaction pin to continue with ${pendingSidebarAction}.`}
            </p>
            <form className="pin-modal-form" onSubmit={handlePinSubmit}>
              <input
                type="password"
                name="pin"
                placeholder="Enter 4-digit pin"
                value={pinForm.pin}
                onChange={handlePinInputChange}
                inputMode="numeric"
                maxLength={4}
                required
              />
              {pinMode === 'create' ? (
                <input
                  type="password"
                  name="confirmPin"
                  placeholder="Confirm 4-digit pin"
                  value={pinForm.confirmPin}
                  onChange={handlePinInputChange}
                  inputMode="numeric"
                  maxLength={4}
                  required
                />
              ) : null}
              {pinError ? <p className="pin-modal-error">{pinError}</p> : null}
              <div className="pin-modal-actions">
                <button className="ghost-btn" type="button" onClick={closePinModal}>
                  Cancel
                </button>
                <button className="primary-btn" type="submit" disabled={isSubmittingPin}>
                  {isSubmittingPin
                    ? pinMode === 'create'
                      ? 'Saving...'
                      : 'Checking...'
                    : pinMode === 'create'
                      ? 'Save Pin'
                      : 'Verify Pin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export async function getServerSideProps(context) {
  const [{ getServerSession }, { authOptions }] = await Promise.all([
    import('next-auth/next'),
    import('../lib/nextAuth'),
  ]);
  const [{ getUserById, getUserFromRequest, toSafeUserId }] = await Promise.all([
    import('../lib/auth'),
  ]);
  const nextAuthSession = await getServerSession(context.req, context.res, authOptions);

  if (nextAuthSession?.user) {
    const nextAuthUserId = toSafeUserId(nextAuthSession.user.id);
    const dbUser = nextAuthUserId ? await getUserById(nextAuthUserId) : null;
    return {
      props: {
        user: {
          full_name: dbUser?.full_name || nextAuthSession.user.name || 'AM Global User',
          username: dbUser?.username || nextAuthSession.user.username || 'googleuser',
          email: dbUser?.email || nextAuthSession.user.email || '',
          phone: dbUser?.phone || '',
          wallet_balance: dbUser?.wallet_balance ?? 0,
          profile_image: dbUser?.profile_image || nextAuthSession.user.image || null,
          authProvider: nextAuthSession.user.authProvider || 'google',
          hasTransactionPin: Boolean(dbUser?.transaction_pin_hash),
        },
      },
    };
  }

  const user = await getUserFromRequest(context.req);

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      user: {
        ...user,
        wallet_balance: user.wallet_balance ?? 0,
        profile_image: user.profile_image || null,
        authProvider: 'credentials',
        hasTransactionPin: Boolean(user.transaction_pin_hash),
      },
    },
  };
}
