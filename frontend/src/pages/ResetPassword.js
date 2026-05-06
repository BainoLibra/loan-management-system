import React, { useState, useEffect } from "react";
import { resetPassword } from "../services/authService";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/login.css";

function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extract token from URL query string
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError("Invalid or missing reset token.");
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (!token) {
        setError("Invalid reset token.");
        setLoading(false);
        return;
      }
      
      if (newPassword.length < 8) {
        setError("Password must be at least 8 characters long.");
        setLoading(false);
        return;
      }

      const data = await resetPassword(token, newPassword);
      setSuccess(data.message || "Password has been successfully reset.");
      
      // Navigate to login after 3 seconds
      setTimeout(() => {
        navigate("/");
      }, 3000);
      
    } catch (err) {
      setError(err.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">L</div>
          <h1>New Password</h1>
          <p className="login-subtitle">Enter your new password below</p>
        </div>

        {error && <div className="login-error">⚠️ {error}</div>}
        {success && <div className="login-success" style={{ padding: "12px", background: "rgba(0,200,80,0.1)", color: "#00b341", borderRadius: "8px", marginBottom: "20px", border: "1px solid rgba(0,200,80,0.2)" }}>✅ {success} Redirecting to login...</div>}

        {!success && !error?.includes("Invalid or missing") ? (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: "10px" }}>
              {loading ? "Resetting..." : "Reset Password"}
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

export default ResetPassword;
