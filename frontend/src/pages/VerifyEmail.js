import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../services/authService";
import "../styles/login.css";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Verifying your email...");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");

    const runVerification = async () => {
      if (!token) {
        setError("Verification link is missing a token.");
        setStatus("");
        return;
      }

      try {
        const data = await verifyEmail(token);
        setStatus(data.message || "Email verified successfully. You can now sign in.");
        setVerified(true);
      } catch (err) {
        setError(err.message || "Unable to verify this email address.");
        setStatus("");
      }
    };

    runVerification();
  }, [searchParams]);

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">L</div>
          <h1>Libra</h1>
          <p className="login-subtitle">Email verification</p>
        </div>

        {status && (
          <div className="login-error" style={{ background: "#e8f8f5", color: "#117864", borderColor: "#a3e4d7" }}>
            {status}
          </div>
        )}
        {error && <div className="login-error">{error}</div>}

        <div className="auth-switch">
          {verified ? <Link to="/">Sign in</Link> : <Link to="/signup">Back to sign up</Link>}
        </div>

        <p className="login-footer">Powered by Libra &copy; 2026</p>
      </div>
    </div>
  );
}

export default VerifyEmail;
