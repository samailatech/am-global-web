import { useState } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import logoImage from '../public/images/logo.jpg';

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    rememberMe: false,
  });
  const [feedback, setFeedback] = useState({ error: '', success: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ error: '', success: '' });
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to log in.');
      }

      setFeedback({ error: '', success: 'Login successful. Redirecting...' });
      await router.push('/dashboard');
    } catch (error) {
      setFeedback({ error: error.message, success: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider) => {
    if (provider === 'google') {
      signIn('google', { callbackUrl: '/dashboard' });
      return;
    }

    window.location.assign(`/api/auth/${provider}/start`);
  };

  const authError =
    typeof router.query.authError === 'string' ? decodeURIComponent(router.query.authError) : '';
  const oauthError =
    typeof router.query.error === 'string' ? 'Google sign-in failed. Please try again.' : '';

  return (
    <div className="auth-page split-page">
      <aside className="promo-panel">
        <div className="promo-copy">
          <h2>AM Global Data</h2>
          <p>Secure telecom subscriptions with beautiful dashboards and instant payouts.</p>
        </div>
        <div className="promo-hero">
          <Image
            src={logoImage}
            alt="AM Global Data logo"
            priority
            className="promo-logo"
            sizes="(max-width: 768px) 220px, 320px"
          />
        </div>
      </aside>
      <section className="auth-card">
        <h1>User Login</h1>
        <form onSubmit={handleSubmit}>
          <label>Phone / Email</label>
          <input
            type="text"
            name="identifier"
            placeholder="you@company.com, username, or +234..."
            value={formData.identifier}
            onChange={handleChange}
            required
          />
          <label>Password</label>
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M3.28 2.22 2.22 3.28l3.08 3.08C3.07 8.13 1.65 10.35 1 12c1.73 4.39 5.99 7.5 11 7.5 2.18 0 4.22-.59 5.97-1.62l2.75 2.75 1.06-1.06L3.28 2.22ZM12 18c-4 0-7.4-2.39-9.13-6 0 0 1.17-2.43 3.52-4.22l2.09 2.09A3.98 3.98 0 0 0 8 12a4 4 0 0 0 4 4c.77 0 1.48-.22 2.08-.6l2.81 2.81c-1.4.72-3.01 1.13-4.89 1.13Zm0-12c5.01 0 9.27 3.11 11 7.5-.5 1.27-1.45 2.96-2.98 4.41l-1.44-1.44A9.73 9.73 0 0 0 21.13 12C19.4 8.39 16 6 12 6c-1.1 0-2.15.18-3.12.5L7.3 4.92A11.6 11.6 0 0 1 12 6Zm-.35 2.03 4.32 4.32c.02-.11.03-.23.03-.35a4 4 0 0 0-4-4c-.12 0-.24.01-.35.03Zm-3.62.88 1.53 1.53A1.99 1.99 0 0 0 10 12a2 2 0 0 0 2 2c.58 0 1.1-.25 1.47-.64l1.53 1.53A3.95 3.95 0 0 1 12 16a4 4 0 0 1-4-4c0-1.12.46-2.13 1.03-2.91Z"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 5c5.01 0 9.27 3.11 11 7.5-1.73 4.39-5.99 7.5-11 7.5S2.73 16.89 1 12.5C2.73 8.11 6.99 5 12 5Zm0 2C8 7 4.6 9.39 2.87 13 4.6 16.61 8 19 12 19s7.4-2.39 9.13-6C19.4 9.39 16 7 12 7Zm0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
                  />
                </svg>
              )}
            </button>
          </div>
          <div className="form-row">
            <label>
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              Remember me
            </label>
            <div className="form-links">
              <a href="/forgot">Forgot password?</a>
            </div>
          </div>
          {authError ? <p className="form-feedback error">{authError}</p> : null}
          {oauthError ? <p className="form-feedback error">{oauthError}</p> : null}
          {feedback.error ? <p className="form-feedback error">{feedback.error}</p> : null}
          {feedback.success ? <p className="form-feedback success">{feedback.success}</p> : null}
          <button className="primary-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="social-login">
          <span>Or Sign Up Using</span>
          <div className="social-chips">
            <button
              className="social-chip"
              type="button"
              aria-label="Sign in with Google"
              onClick={() => handleSocialLogin('google')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M21.805 10.023H12v3.955h5.617c-.242 1.273-.967 2.351-2.06 3.076v2.557h3.34c1.955-1.8 3.083-4.453 2.908-7.588Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.79 0 5.13-.924 6.84-2.511l-3.34-2.557c-.928.623-2.116.99-3.5.99-2.69 0-4.97-1.816-5.786-4.26H2.763v2.637A10 10 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.214 13.662A5.996 5.996 0 0 1 5.89 12c0-.577.117-1.133.324-1.662V7.7H2.763A10 10 0 0 0 2 12c0 1.61.386 3.13 1.063 4.3l3.151-2.638Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6.078c1.517 0 2.88.522 3.953 1.548l2.965-2.965C17.125 2.996 14.786 2 12 2A10 10 0 0 0 2.763 7.7l3.451 2.638C7.03 7.894 9.31 6.078 12 6.078Z"
                />
              </svg>
            </button>
            <button
              className="social-chip"
              type="button"
              aria-label="Sign in with Apple"
              onClick={() => handleSocialLogin('apple')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M16.365 12.787c.027 2.918 2.56 3.89 2.588 3.902-.021.067-.404 1.383-1.33 2.742-.8 1.175-1.63 2.346-2.94 2.37-1.288.024-1.702-.765-3.175-.765-1.474 0-1.933.741-3.15.79-1.264.048-2.227-1.265-3.034-2.435C3.676 16.995 2.4 12.61 4.09 9.68c.84-1.456 2.34-2.377 3.968-2.4 1.24-.024 2.411.838 3.175.838.763 0 2.196-1.037 3.7-.885.629.026 2.396.254 3.531 1.916-.091.056-2.108 1.228-2.1 3.638ZM14.84 4.401c.671-.813 1.122-1.944.999-3.07-.968.039-2.142.645-2.837 1.458-.623.72-1.17 1.873-1.022 2.975 1.08.083 2.189-.548 2.86-1.363Z"
                />
              </svg>
            </button>
          </div>
        </div>
        <p className="auth-switch">
          Don&apos;t have an account yet ? <a href="/register">Sign Up</a>
        </p>
      </section>
    </div>
  );
}
