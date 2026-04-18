import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getGroups, createGroup, updateGroup, deleteGroup } from "../services/groupService";
import "../styles/table.css";

const PAGE_SIZE = 10;

function Groups() {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    const data = await getGroups();
    if (Array.isArray(data)) setGroups(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Group name is required.");
      return;
    }

    const response = editingId
      ? await updateGroup(editingId, form)
      : await createGroup(form);

    if (response.error) {
      setError(response.error);
      return;
    }

    setForm({ name: "", description: "" });
    setShowForm(false);
    setEditingId(null);
    fetchGroups();
  };

  const handleEdit = (g) => {
    setEditingId(g.id);
    setForm({ name: g.name, description: g.description || "" });
    setError("");
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this group?")) return;
    const res = await deleteGroup(id);
    if (res.error) { alert(res.error); return; }
    fetchGroups();
  };

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout>
      <h2>Client Groups</h2>
      <div className="toolbar">
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "", description: "" }); setError(""); }}>
          {showForm ? "Cancel" : "+ New Group"}
        </button>
        <input
          className="search-input"
          placeholder="Search groups..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="inline-form">
          {error && <div className="form-error">{error}</div>}
          <input
            placeholder="Group Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button type="submit">{editingId ? "Update" : "Save Group"}</button>
        </form>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((g) => (
              <tr key={g.id}>
                <td>{g.id}</td>
                <td>{g.name}</td>
                <td>{g.description || "N/A"}</td>
                <td>
                  <button className="btn-sm" onClick={() => handleEdit(g)}>Edit</button>{" "}
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(g.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </Layout>
  );
}

export default Groups;
