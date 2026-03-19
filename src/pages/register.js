import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    referralUsername: '',
    bvn: '',
    nin: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
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

    if (!formData.bvn.trim() && !formData.nin.trim()) {
      setFeedback({
        error: 'Provide your BVN or NIN so your Monnify account number can be created.',
        success: '',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to create account.');
      }

      setFeedback({ error: '', success: 'Account created successfully. Redirecting...' });
      await router.push('/dashboard');
    } catch (error) {
      setFeedback({ error: error.message, success: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>Create account</h1>
        <form onSubmit={handleSubmit}>
          <label>Full Name*</label>
          <input
            type="text"
            name="fullName"
            placeholder="e.g. John Doe"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
          <label>Username*</label>
          <input
            type="text"
            name="username"
            placeholder="e.g. Johndoe12"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <label>Email*</label>
          <input
            type="email"
            name="email"
            placeholder="you@company.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <label>Phone*</label>
          <input
            type="tel"
            name="phone"
            placeholder="e.g. +234..."
            value={formData.phone}
            onChange={handleChange}
            required
          />
          <label>Address*</label>
          <input
            type="text"
            name="address"
            placeholder="Enter your address"
            value={formData.address}
            onChange={handleChange}
            required
          />
          <label>Referral username [optional]</label>
          <input
            type="text"
            name="referralUsername"
            placeholder="Referral username"
            value={formData.referralUsername}
            onChange={handleChange}
          />
          <small className="field-note">Leave blank if no referral</small>
          <label>BVN or NIN*</label>
          <input
            type="text"
            name="bvn"
            placeholder="Enter your BVN"
            value={formData.bvn}
            onChange={handleChange}
          />
          <small className="field-note">Provide your BVN if you do not want to use NIN</small>
          <label>NIN [optional]</label>
          <input
            type="text"
            name="nin"
            placeholder="Enter your NIN"
            value={formData.nin}
            onChange={handleChange}
          />
          <small className="field-note">At least one of BVN or NIN is required for account allocation</small>
          <label>Password*</label>
          <input
            type="password"
            name="password"
            placeholder="Choose a strong password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <small className="field-note">min_lenght-8 mix characters [i.e musa1234]</small>
          <label>Confirm Password*</label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
          <small className="field-note">Enter same password as before</small>
          <label className="terms-check">
            <input
              type="checkbox"
              name="acceptedTerms"
              checked={formData.acceptedTerms}
              onChange={handleChange}
              required
            />
            <span>I Agree the terms and conditions.</span>
          </label>
          {feedback.error ? <p className="form-feedback error">{feedback.error}</p> : null}
          {feedback.success ? <p className="form-feedback success">{feedback.success}</p> : null}
          <button className="primary-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Continue'}
          </button>
        </form>
      </section>
    </div>
  );
}
