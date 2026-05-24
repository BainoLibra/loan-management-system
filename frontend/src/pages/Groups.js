import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getGroups, getGroupById, createGroup, updateGroup, deleteGroup, updateGroupMembers } from "../services/groupService";
import { getClients, createClient } from "../services/clientService";
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

  const [viewingGroup, setViewingGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [newClientForm, setNewClientForm] = useState({ firstName: "", lastName: "", phone: "", identifier: "", guarantorName: "", guarantorPhone: "" });
  const [newClientError, setNewClientError] = useState("");
  const [isAddingClient, setIsAddingClient] = useState(false);

  const currentUser = getUser();
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => { fetchGroups(); }, []);

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
      if (!editingId && isAdmin) {
        setError('Admins are not permitted to create groups.');
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
        const availableClients = isAdmin
          ? clientsData
          : clientsData.filter(c => c.groupId === null || c.groupId === g.id);

        setAllClients(availableClients);
        const currentMemberIds = clientsData.filter(c => c.groupId === g.id).map(c => c.id);
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
      setSelectedClientIds(selectedClientIds.filter(id => id !== clientId));
    } else {
      setSelectedClientIds([...selectedClientIds, clientId]);
    }
  };

  const handleViewGroup = async (g) => {
    setViewingGroup(g);
    resetNewClientForm();
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

  const resetNewClientForm = () => {
    setNewClientForm({ firstName: "", lastName: "", phone: "", identifier: "", guarantorName: "", guarantorPhone: "" });
    setNewClientError("");
  };

  const handleAddClientToGroup = async (e) => {
    e.preventDefault();
    if (!viewingGroup) return;

    const trimmedFirstName = newClientForm.firstName.trim();
    const trimmedLastName = newClientForm.lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setNewClientError("First name and last name are required.");
      return;
    }

    try {
      setNewClientError("");
      setIsAddingClient(true);
      await createClient({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        identifier: newClientForm.identifier.trim() || null,
        phone: newClientForm.phone.trim() || null,
        guarantorName: newClientForm.guarantorName.trim() || null,
        guarantorPhone: newClientForm.guarantorPhone.trim() || null,
        groupId: viewingGroup.id,
      });
      await handleViewGroup(viewingGroup);
      resetNewClientForm();
    } catch (err) {
      setNewClientError(err.message || "Failed to add client to group.");
    } finally {
      setIsAddingClient(false);
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
      {error && <div className="form-error">{error}</div>}
      <div className="toolbar">
        {currentUser?.role === "loan_officer" && (
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
              <th>No.</th>
              <th>Name</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((g, index) => (
              <tr key={g.id}>
                <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                <td>
                  <span style={{ color: "#3498db", cursor: "pointer", textDecoration: "underline" }} onClick={() => handleViewGroup(g)}>
                    {g.name}
                  </span>
                </td>
                <td>{g.description || "N/A"}</td>
                <td>
                  {(isAdmin || currentUser?.role === "loan_officer") && (
                    <button className="btn-sm" onClick={() => handleManageMembers(g)}>Members</button>
                  )} {" "}
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
          <div className="modal-content">
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

      {viewingGroup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Members in Group: {viewingGroup.name}</h3>
            <div className="members-list" style={{ maxHeight: "220px", overflowY: "auto", margin: "1rem 0", textAlign: "left" }}>
              {groupMembers.length === 0 ? (
                <p>No members in this group.</p>
              ) : (
                <ul style={{ listStyleType: "none", padding: 0 }}>
                  {groupMembers.map(client => (
                    <li key={client.id} style={{ marginBottom: "0.5rem", padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                      <strong>{client.firstName} {client.lastName}</strong><br/>
                      <small style={{ color: "#7f8c8d" }}>
                        Unique ID: {client.identifier || "N/A"} | System ID: {client.id}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!isAdmin && (
              <div style={{ marginTop: "1rem", borderTop: "1px solid #e0e0e0", paddingTop: "1rem" }}>
                <h4>Add New Client to {viewingGroup.name}</h4>
                {newClientError && <div className="form-error">{newClientError}</div>}
                <form onSubmit={handleAddClientToGroup} style={{ display: "grid", gap: "0.75rem", marginTop: "0.5rem" }}>
                <input
                  placeholder="First Name"
                  value={newClientForm.firstName}
                  onChange={(e) => setNewClientForm({ ...newClientForm, firstName: e.target.value })}
                  required
                />
                <input
                  placeholder="Last Name"
                  value={newClientForm.lastName}
                  onChange={(e) => setNewClientForm({ ...newClientForm, lastName: e.target.value })}
                  required
                />
                <input
                  placeholder="NIN / Identifier"
                  value={newClientForm.identifier}
                  onChange={(e) => setNewClientForm({ ...newClientForm, identifier: e.target.value.toUpperCase() })}
                />
                <input
                  placeholder="Phone"
                  value={newClientForm.phone}
                  onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                />
                <input
                  placeholder="Guarantor Name"
                  value={newClientForm.guarantorName}
                  onChange={(e) => setNewClientForm({ ...newClientForm, guarantorName: e.target.value })}
                />
                <input
                  placeholder="Guarantor Phone"
                  value={newClientForm.guarantorPhone}
                  onChange={(e) => setNewClientForm({ ...newClientForm, guarantorPhone: e.target.value })}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button className="btn-secondary" type="button" onClick={resetNewClientForm}>Clear</button>
                  <button type="submit" disabled={isAddingClient}>{isAddingClient ? "Adding..." : "Add Client"}</button>
                </div>
              </form>
            </div>
            )}

            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className="btn-secondary" onClick={() => { setViewingGroup(null); setGroupMembers([]); resetNewClientForm(); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Groups;
