import React, { useState } from "react";
import { forgotPassword } from "../services/authService";
import { Link } from "react-router-dom";
import "../styles/login.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (!email) {
        setError("Please enter your email address");
        setLoading(false);
        return;
      }

      const data = await forgotPassword(email);
      setSuccess(data.message || "Password reset link has been sent.");
    } catch (err) {
      setError(err.message || "Unable to process request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">L</div>
          <h1>Reset Password</h1>
          <p className="login-subtitle">Enter your email to receive a reset link</p>
        </div>

        {error && <div className="login-error">⚠️ {error}</div>}
        {success && <div className="login-success" style={{ padding: "12px", background: "rgba(0,200,80,0.1)", color: "#00b341", borderRadius: "8px", marginBottom: "20px", border: "1px solid rgba(0,200,80,0.2)" }}>✅ {success}</div>}

        {!success ? (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={loading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: "10px" }}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        ) : null}

        <div className="auth-switch" style={{ marginTop: "20px" }}>
          <Link to="/">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
