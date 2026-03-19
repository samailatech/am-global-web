export default function ForgotPassword() {
  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>Forgot password</h1>
        <p>Enter your email or phone; we will send an OTP link.</p>
        <form>
          <label>Phone / Email</label>
          <input type="text" placeholder="you@company.com or +234..." />
          <button className="primary-btn" type="button">
            Send reset link
          </button>
        </form>
        <p className="helper">
          <a href="/login">Return to login</a>
        </p>
      </section>
    </div>
  );
}
