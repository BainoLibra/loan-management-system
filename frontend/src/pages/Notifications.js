import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getNotifications, retryNotification } from "../services/notificationService";
import { getUser } from "../services/authService";
import { IconAlert } from "../components/Icons";
import "../styles/table.css";

const statusClass = (status) => {
  if (status === "SENT") return "disbursed";
  if (status === "FAILED") return "rejected";
  return "approved";
};

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(null);
  const user = getUser();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleRetry = async (id) => {
    try {
      setRetrying(id);
      setError("");
      await retryNotification(id);
      await loadNotifications();
    } catch (err) {
      setError(err.message || "Failed to retry notification");
    } finally {
      setRetrying(null);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Notifications</h2>
          <p>Track borrower and operational delivery events for the active organisation.</p>
        </div>
        {user?.role === "admin" && <span className="status-badge approved">Administrator delivery controls</span>}
      </div>

      {error && <div className="form-error"><IconAlert size={18} /><span>{error}</span></div>}

      <div className="table-card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Event</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Created</th><th /></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "30px" }}>Loading notifications...</td></tr>
              ) : notifications.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "30px" }}>No notifications have been queued.</td></tr>
              ) : notifications.map((notification) => (
                <tr key={notification.id}>
                  <td>{notification.eventType}</td>
                  <td>{notification.recipientEmail || "Unavailable"}</td>
                  <td>{notification.subject}</td>
                  <td><span className={`status-badge ${statusClass(notification.status)}`}>{notification.status}</span></td>
                  <td>{new Date(notification.createdAt).toLocaleString()}</td>
                  <td>{user?.role === "admin" && notification.status !== "SENT" && (
                    <button className="btn btn-secondary btn-sm" disabled={retrying === notification.id} onClick={() => handleRetry(notification.id)}>
                      {retrying === notification.id ? "Retrying..." : "Retry"}
                    </button>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

export default Notifications;