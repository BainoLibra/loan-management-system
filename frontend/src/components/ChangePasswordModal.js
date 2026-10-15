import React, { useState } from "react";
import { changePassword } from "../services/authService";
import { IconEye, IconEyeOff } from "./Icons";
import "../styles/modal.css";

function ChangePasswordModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const result = await changePassword(form.currentPassword, form.newPassword);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      alert("Password changed successfully!");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Change Password</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Current Password</label>
            <div className="password-input-wrapper">
              <input
                type={showCurrent ? "text" : "password"}
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowCurrent((prev) => !prev)}
                title={showCurrent ? "Hide password" : "Show password"}
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showNew ? "text" : "password"}
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowNew((prev) => !prev)}
                title={showNew ? "Hide password" : "Show password"}
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirm ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirm((prev) => !prev)}
                title={showConfirm ? "Hide password" : "Show password"}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={handleClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;