import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getGroups, getGroupById, createGroup, updateGroup, deleteGroup, updateGroupMembers } from "../services/groupService";
import { getClients } from "../services/clientService";
import { getUser } from "../services/authService";
import { IconSearch, IconPlus, IconAlert } from "../components/Icons";
import "../styles/table.css";
import "../styles/modal.css";

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

  const [viewingGroup, setViewingGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);

  const currentUser = getUser();
  const isAdmin = currentUser?.role === "admin";
  const canCreateGroup = isAdmin || currentUser?.role === "loan_officer";

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setError("");
      const data = await getGroups();
      if (Array.isArray(data)) setGroups(data);
    } catch (err) {
      setError(err.message || "Failed to load groups");
      setGroups([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Group name is required.");
      return;
    }

    try {
      const response = editingId ? await updateGroup(editingId, form) : await createGroup(form);

      if (response.error) {
        setError(response.error);
        return;
      }

      setForm({ name: "", description: "" });
      setShowForm(false);
      setEditingId(null);
      fetchGroups();
    } catch (err) {
      setError(err.message || "Failed to save group");
    }
  };

  const handleEdit = (g) => {
    setEditingId(g.id);
    setForm({ name: g.name, description: g.description || "" });
    setError("");
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this group?")) return;
    try {
      setError("");
      await deleteGroup(id);
      fetchGroups();
    } catch (err) {
      setError(err.message || "Failed to delete group");
    }
  };

  const handleManageMembers = async (g) => {
    setManagingGroup(g);
    try {
      const clientsData = await getClients();
      if (Array.isArray(clientsData)) {
        const availableClients = isAdmin ? clientsData : clientsData.filter((c) => c.groupId === null || c.groupId === g.id);

        setAllClients(availableClients);
        const currentMemberIds = clientsData.filter((c) => c.groupId === g.id).map((c) => c.id);
        setSelectedClientIds(currentMemberIds);
        setInitialSelectedClientIds(currentMemberIds);
        setShowMembersModal(true);
      } else {
        alert(clientsData.error || "Failed to load clients.");
      }
    } catch (err) {
      setError(err.message || "Failed to load clients.");
    }
  };

  const handleSaveMembers = async () => {
    try {
      setIsSavingMembers(true);
      setError("");
      await updateGroupMembers(managingGroup.id, selectedClientIds);
      setShowMembersModal(false);
      setManagingGroup(null);
      fetchGroups();
    } catch (err) {
      setError(err.message || "Failed to save members");
    } finally {
      setIsSavingMembers(false);
    }
  };

  const toggleClient = (clientId) => {
    if (selectedClientIds.includes(clientId)) {
      setSelectedClientIds(selectedClientIds.filter((id) => id !== clientId));
    } else {
      setSelectedClientIds([...selectedClientIds, clientId]);
    }
  };

  const handleViewGroup = async (g) => {
    setViewingGroup(g);
    try {
      const data = await getGroupById(g.id);
      if (data && data.clients) {
        setGroupMembers(data.clients);
      } else {
        setGroupMembers([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load group members.");
    }
  };

  const filtered = groups.filter(
    (g) => g.name.toLowerCase().includes(search.toLowerCase()) || (g.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Client Groups</h2>
          <p>Organize microfinance borrowers into lending groups and manage group memberships.</p>
        </div>
        <div className="page-actions">
          {canCreateGroup && (
            <button
              className="btn"
              onClick={() => {
                setShowForm(!showForm);
                setEditingId(null);
                setForm({ name: "", description: "" });
                setError("");
              }}
            >
              <IconPlus size={16} />
              <span>{showForm ? "Cancel" : "New Group"}</span>
            </button>
          )}
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
            placeholder="Search group name or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="inline-form">
          <input
            placeholder="Group Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            style={{ minWidth: "240px" }}
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ minWidth: "300px" }}
          />
          <button className="btn" type="submit">
            {editingId ? "Update Group" : "Save Group"}
          </button>
        </form>
      )}

      <div className="table-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Group Name</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                    No client groups found.
                  </td>
                </tr>
              ) : (
                paginated.map((g, index) => (
                  <tr key={g.id}>
                    <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td>
                      <span
                        style={{ color: "var(--primary)", fontWeight: "600", cursor: "pointer" }}
                        onClick={() => handleViewGroup(g)}
                      >
                        {g.name}
                      </span>
                    </td>
                    <td>{g.description || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {isAdmin && (
                          <>
                            <button className="btn-sm btn-secondary" onClick={() => handleManageMembers(g)}>
                              Members
                            </button>
                            <button className="btn-sm btn-secondary" onClick={() => handleEdit(g)}>
                              Edit
                            </button>
                            <button className="btn-sm btn-danger" onClick={() => handleDelete(g.id)}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <span>
            Page {page} of {totalPages} ({filtered.length} total groups)
          </span>
          <div className="pagination-buttons">
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </div>
      )}

      {showMembersModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Manage Members: {managingGroup?.name}</h3>
            <div className="members-list" style={{ maxHeight: "300px", overflowY: "auto", margin: "16px 0" }}>
              {allClients.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No available clients.</p>
              ) : (
                allClients.map((client) => (
                  <label key={client.id} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <input
                      type="checkbox"
                      checked={selectedClientIds.includes(client.id)}
                      disabled={!isAdmin && initialSelectedClientIds.includes(client.id)}
                      onChange={() => toggleClient(client.id)}
                    />
                    <span>
                      {client.firstName} {client.lastName}{" "}
                      <small style={{ color: "var(--text-muted)" }}>({client.identifier || client.phone || "No ID"})</small>
                    </span>
                  </label>
                ))
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowMembersModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveMembers} disabled={isSavingMembers}>
                {isSavingMembers ? "Saving..." : "Save Members"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingGroup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Group Roster: {viewingGroup.name}</h3>
            <div className="members-list" style={{ maxHeight: "260px", overflowY: "auto", margin: "16px 0" }}>
              {groupMembers.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No members assigned to this group yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {groupMembers.map((client) => (
                    <div key={client.id} style={{ padding: "10px 14px", background: "var(--bg-main)", borderRadius: "var(--radius-md)" }}>
                      <strong style={{ color: "var(--text-main)" }}>
                        {client.firstName} {client.lastName}
                      </strong>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        ID: {client.identifier || "N/A"} | Phone: {client.phone || "N/A"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setViewingGroup(null);
                  setGroupMembers([]);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Groups;
