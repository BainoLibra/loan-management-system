import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getUsers, createUser, updateUser, resetUserPassword, deleteUser } from "../services/userService";
import "../styles/table.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "loan_officer" });
  const [resetPw, setResetPw] = useState({ id: null, password: "" });
  const [search, setSearch] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const data = await getUsers();
    if (Array.isArray(data)) setUsers(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingUser) {
      await updateUser(editingUser.id, { name: form.name, email: form.email, role: form.role, status: form.status });
    } else {
      await createUser(form);
    }
    setForm({ name: "", email: "", password: "", role: "loan_officer" });
    setShowForm(false);
    setEditingUser(null);
    fetchUsers();
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, status: user.status, password: "" });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    await deleteUser(id);
    fetchUsers();
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    await resetUserPassword(resetPw.id, resetPw.password);
    setResetPw({ id: null, password: "" });
    alert("Password reset successfully");
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <h2>User Management</h2>
      <div className="toolbar">
        <button onClick={() => { setShowForm(!showForm); setEditingUser(null); setForm({ name: "", email: "", password: "", role: "loan_officer" }); }}>
          {showForm ? "Cancel" : "+ New User"}
        </button>
        <input
          className="search-input"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="inline-form">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          {!editingUser && (
            <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          )}
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="admin">Admin</option>
            <option value="loan_officer">Loan Officer</option>
            <option value="cashier">Cashier</option>
          </select>
          {editingUser && (
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          )}
          <button type="submit">{editingUser ? "Update" : "Create User"}</button>
        </form>
      )}

      {resetPw.id && (
        <form onSubmit={handleResetPassword} className="inline-form">
          <span>Reset password for user #{resetPw.id}:</span>
          <input type="password" placeholder="New Password" value={resetPw.password} onChange={(e) => setResetPw({ ...resetPw, password: e.target.value })} required />
          <button type="submit">Reset</button>
          <button type="button" className="btn-secondary" onClick={() => setResetPw({ id: null, password: "" })}>Cancel</button>
        </form>
      )}

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
          {filtered.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
              <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
              <td>
                <button className="btn-sm" onClick={() => handleEdit(u)}>Edit</button>{" "}
                <button className="btn-sm btn-warn" onClick={() => setResetPw({ id: u.id, password: "" })}>Reset Pwd</button>{" "}
                <button className="btn-sm btn-danger" onClick={() => handleDelete(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}

export default Users;
