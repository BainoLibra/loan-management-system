import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/authService";
import "../styles/login.css";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("loan_officer");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser(name, email, password, role);
      if (data.error) {
        setError(data.error);
      } else if (data.message) {
        setSuccess(data.message + " Please sign in.");
        setTimeout(() => navigate("/"), 1200);
      } else {
        setError("Signup failed. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">L</div>
          <h1>Libra</h1>
          <p className="login-subtitle">Create an account</p>
        </div>

        {error && <div className="login-error">{error}</div>}
        {success && <div className="login-error" style={{ background: "#e8f8f5", color: "#117864", borderColor: "#a3e4d7" }}>{success}</div>}

        <form onSubmit={handleSignup} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="loan_officer">Loan Officer</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="auth-switch">
          <span>Already have an account?</span>
          <Link to="/">Sign in</Link>
        </div>

        <p className="login-footer">Powered by Libra &copy; 2026</p>
      </div>
    </div>
  );
}

export default Signup;
