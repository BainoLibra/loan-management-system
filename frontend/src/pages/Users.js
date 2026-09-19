import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getUsers, createUser, updateUser, resetUserPassword, deleteUser } from "../services/userService";
import { IconSearch, IconPlus, IconAlert } from "../components/Icons";
import "../styles/table.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "loan_officer" });
  const [resetPw, setResetPw] = useState({ id: null, password: "" });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setError("");
      const data = await getUsers();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to load users");
      setUsers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      if (editingUser) {
        await updateUser(editingUser.id, { name: form.name, email: form.email, role: form.role, status: form.status });
      } else {
        await createUser(form);
      }
      setForm({ name: "", email: "", password: "", role: "loan_officer" });
      setShowForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.message || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, status: user.status, password: "" });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      setError("");
      await deleteUser(id);
      fetchUsers();
    } catch (err) {
      setError(err.message || "Failed to delete user");
    }
  };

  const openResetPasswordForm = (user) => {
    setEditingUser(null);
    setShowForm(false);
    setResetPw({ id: user.id, password: "" });
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      await resetUserPassword(resetPw.id, resetPw.password);
      setResetPw({ id: null, password: "" });
      alert("Password reset successfully");
      await fetchUsers();
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="page-header">
        <div className="page-title-group">
          <h2>System Accounts & Users</h2>
          <p>Manage system staff roles (Admins, Loan Officers, Cashiers, Branch Managers) and access credentials.</p>
        </div>
        <div className="page-actions">
          <button
            className="btn"
            onClick={() => {
              setShowForm(!showForm);
              setEditingUser(null);
              setForm({ name: "", email: "", password: "", role: "loan_officer" });
            }}
          >
            <IconPlus size={16} />
            <span>{showForm ? "Cancel" : "New System Account"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="form-error">
          <IconAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="toolbar">
        <div className="search-input-wrapper">
          <IconSearch className="search-input-icon" size={16} />
          <input
            className="search-input"
            placeholder="Search users by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="inline-form">
          <input
            placeholder="Full Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Email Address *"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          {!editingUser && (
            <input
              placeholder="Initial Password *"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          )}
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="admin">Administrator</option>
            <option value="loan_officer">Loan Officer</option>
            <option value="branch_manager">Branch Manager</option>
            <option value="cashier">Cashier</option>
          </select>
          {editingUser && (
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          )}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editingUser ? "Update User" : "Create User"}
          </button>
        </form>
      )}

      {resetPw.id && (
        <form onSubmit={handleResetPassword} className="inline-form" style={{ background: "var(--primary-light)" }}>
          <span style={{ fontWeight: 600, color: "var(--text-main)" }}>Reset password for user #{resetPw.id}:</span>
          <input
            type="password"
            placeholder="Enter New Password..."
            value={resetPw.password}
            onChange={(e) => setResetPw({ ...resetPw, password: e.target.value })}
            required
          />
          <button className="btn btn-warn" type="submit" disabled={submitting}>
            {submitting ? "Resetting..." : "Confirm Reset"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setResetPw({ id: null, password: "" })}>
            Cancel
          </button>
        </form>
      )}

      <div className="table-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                    No system users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge badge-${u.role}`}>{u.role.replace("_", " ")}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${u.status}`}>{u.status}</span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button type="button" className="btn-sm btn-secondary" onClick={() => handleEdit(u)}>
                          Edit
                        </button>
                        <button type="button" className="btn-sm btn-warn" onClick={() => openResetPasswordForm(u)}>
                          Reset Pwd
                        </button>
                        <button type="button" className="btn-sm btn-danger" onClick={() => handleDelete(u.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

export default Users;
