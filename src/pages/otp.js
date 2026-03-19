import { useEffect, useRef, useState } from 'react';

const digits = new Array(6).fill('');

export default function OTP() {
  const [counter, setCounter] = useState(30);
  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const goNext = (index, value) => {
    if (value && index < inputs.current.length - 1) {
      inputs.current[index + 1].focus();
    }
  };

  return (
    <div className="auth-page otp-page">
      <section className="auth-card">
        <h1>OTP Verification</h1>
        <p>Enter the six-digit code sent to your phone.</p>
        <div className="otp-inputs">
          {digits.map((_, index) => (
            <input
              key={index}
              maxLength={1}
              type="text"
              ref={(el) => (inputs.current[index] = el)}
              onChange={(event) => goNext(index, event.target.value)}
            />
          ))}
        </div>
        <p className="helper">Resend code in {counter}s · <a href="/login">Edit number</a></p>
        <div className="progress-bar">
          <span style={{ width: `${(30 - counter) * (100 / 30)}%` }} />
        </div>
        <div className="form-row">
          <button className="primary-btn" type="button">
            Verify
          </button>
          <button className="ghost-link" type="button">
            Need help?
          </button>
        </div>
      </section>
    </div>
  );
}
