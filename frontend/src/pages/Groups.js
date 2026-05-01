import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getGroups, createGroup, updateGroup, deleteGroup, updateGroupMembers } from "../services/groupService";
import { getClients } from "../services/clientService";
import { getUser } from "../services/authService";
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

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [managingGroup, setManagingGroup] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [initialSelectedClientIds, setInitialSelectedClientIds] = useState([]);
  const [isSavingMembers, setIsSavingMembers] = useState(false);

  const currentUser = getUser();
  const isAdmin = currentUser?.role === "admin";

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

  const handleManageMembers = async (g) => {
    setManagingGroup(g);
    try {
      const clientsData = await getClients();
      if (Array.isArray(clientsData)) {
        setAllClients(clientsData);
        const currentMemberIds = clientsData.filter(c => c.groupId === g.id).map(c => c.id);
        setSelectedClientIds(currentMemberIds);
        setInitialSelectedClientIds(currentMemberIds);
        setShowMembersModal(true);
      } else {
        alert(clientsData.error || "Failed to load clients.");
      }
    } catch (err) {
      alert("Failed to load clients.");
    }
  };

  const handleSaveMembers = async () => {
    setIsSavingMembers(true);
    const res = await updateGroupMembers(managingGroup.id, selectedClientIds);
    setIsSavingMembers(false);
    if (res.error) {
      alert(res.error);
    } else {
      setShowMembersModal(false);
      setManagingGroup(null);
      fetchGroups();
    }
  };

  const toggleClient = (clientId) => {
    if (selectedClientIds.includes(clientId)) {
      setSelectedClientIds(selectedClientIds.filter(id => id !== clientId));
    } else {
      setSelectedClientIds([...selectedClientIds, clientId]);
    }
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
        {(isAdmin || currentUser?.role === "loan_officer") && (
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "", description: "" }); setError(""); }}>
            {showForm ? "Cancel" : "+ New Group"}
          </button>
        )}
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
                  <button className="btn-sm" onClick={() => handleManageMembers(g)}>Members</button>{" "}
                  {(isAdmin || currentUser?.role === "loan_officer") && (
                    <button className="btn-sm" onClick={() => handleEdit(g)}>Edit</button>
                  )}
                  {" "}
                  {isAdmin && (
                    <button className="btn-sm btn-danger" onClick={() => handleDelete(g.id)}>Delete</button>
                  )}
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

      {showMembersModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Manage Members for: {managingGroup?.name}</h3>
            <div className="members-list" style={{ maxHeight: "300px", overflowY: "auto", margin: "1rem 0", textAlign: "left" }}>
              {allClients.length === 0 ? (
                <p>No clients available.</p>
              ) : (
                allClients.map(client => (
                  <label key={client.id} style={{ display: "block", marginBottom: "0.5rem" }}>
                    <input
                      type="checkbox"
                      checked={selectedClientIds.includes(client.id)}
                      disabled={!isAdmin && initialSelectedClientIds.includes(client.id)}
                      onChange={() => toggleClient(client.id)}
                    />
                    {" "}{client.firstName} {client.lastName} ({client.identifier || client.phone || "No ID"})
                  </label>
                ))
              )}
            </div>
            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button className="btn-secondary" onClick={() => setShowMembersModal(false)}>Cancel</button>
              <button onClick={handleSaveMembers} disabled={isSavingMembers}>
                {isSavingMembers ? "Saving..." : "Save Members"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Groups;
