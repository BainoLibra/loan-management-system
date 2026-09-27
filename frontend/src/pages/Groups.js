import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  updateGroupMembers,
  getGroupCollectionSheet,
  batchGroupRepayment
} from "../services/groupService";
import { getClients } from "../services/clientService";
import { getUser } from "../services/authService";
import { formatShillings } from "../utils/format";
import { IconSearch, IconPlus, IconAlert, IconCheck } from "../components/Icons";
import "../styles/table.css";
import "../styles/modal.css";

const PAGE_SIZE = 10;

function Groups() {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", meetingDay: "Monday" });
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

  const [collectionSheet, setCollectionSheet] = useState(null);
  const [collectionAmounts, setCollectionAmounts] = useState({});
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [batchSuccessResult, setBatchSuccessResult] = useState(null);

  const currentUser = getUser();
  const isAdmin = currentUser?.role === "admin";
  const canCreateGroup = isAdmin || currentUser?.role === "loan_officer";

  const handleOpenCollectionSheet = async (g) => {
    try {
      setError("");
      setBatchSuccessResult(null);
      const data = await getGroupCollectionSheet(g.id);
      if (data && data.members) {
        setCollectionSheet(data);
        const initialAmounts = {};
        data.members.forEach((m) => {
          if (m.hasActiveLoan) {
            initialAmounts[m.loanId] = m.expectedInstallment;
          }
        });
        setCollectionAmounts(initialAmounts);
      } else {
        setError(data?.error || "Failed to load collection sheet");
      }
    } catch (err) {
      setError(err.message || "Failed to load collection sheet");
    }
  };

  const handleAmountChange = (loanId, val) => {
    const num = Math.max(0, Number(val) || 0);
    setCollectionAmounts((prev) => ({ ...prev, [loanId]: num }));
  };

  const handleBatchCollect = async () => {
    if (!collectionSheet) return;
    try {
      setIsSubmittingBatch(true);
      setError("");
      const payments = Object.entries(collectionAmounts)
        .filter(([_, amt]) => amt > 0)
        .map(([loanId, amt]) => {
          const memberObj = collectionSheet.members.find((m) => String(m.loanId) === String(loanId));
          return {
            loanId: Number(loanId),
            amount: amt,
            scheduleId: memberObj?.scheduleId || null,
          };
        });

      if (payments.length === 0) {
        setError("Enter repayment amounts for at least one member.");
        setIsSubmittingBatch(false);
        return;
      }

      const res = await batchGroupRepayment(collectionSheet.groupId, payments, "cash");
      if (res.error) {
        setError(res.error);
      } else {
        setBatchSuccessResult(res);
        setCollectionSheet(null);
        fetchGroups();
      }
    } catch (err) {
      setError(err.message || "Failed to record group collection.");
    } finally {
      setIsSubmittingBatch(false);
    }
  };

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

      setForm({ name: "", description: "", meetingDay: "Monday" });
      setShowForm(false);
      setEditingId(null);
      fetchGroups();
    } catch (err) {
      setError(err.message || "Failed to save group");
    }
  };

  const handleEdit = (g) => {
    setEditingId(g.id);
    setForm({ name: g.name, description: g.description || "", meetingDay: g.meetingDay || "Monday" });
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

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = groups.filter((g) => {
    const haystack = `${g.name || ""} ${g.description || ""} ${g.meetingDay || ""}`.toLowerCase();
    return haystack.includes(normalizedSearch);
  });

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
                setForm({ name: "", description: "", meetingDay: "Monday" });
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
            placeholder="Search group name, day, or description..."
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
            style={{ minWidth: "220px" }}
          />
          <select
            value={form.meetingDay || "Monday"}
            onChange={(e) => setForm({ ...form, meetingDay: e.target.value })}
            style={{ minWidth: "150px", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
          >
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ minWidth: "280px" }}
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
                <th>Meeting Day</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
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
                    <td>{g.meetingDay || "Monday"}</td>
                    <td>{g.description || "—"}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        <button className="btn-sm btn-primary" onClick={() => handleOpenCollectionSheet(g)}>
                          Collect Group Cash
                        </button>
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

      {/* Field Collection Sheet Modal */}
      {collectionSheet && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div className="modal-card" style={{ background: "#ffffff", padding: "28px", borderRadius: "12px", maxWidth: "680px", width: "95%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <div style={{ borderBottom: "2px solid var(--primary)", paddingBottom: "12px", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, color: "var(--primary)" }}>Field Collection Sheet — {collectionSheet.groupName}</h2>
              <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Total Group Members: <strong>{collectionSheet.totalMembers}</strong> | Active Loans: <strong>{collectionSheet.totalActiveLoans}</strong>
              </p>
            </div>

            <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
              <div>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Total Expected Collection Today:</span>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--primary)" }}>
                  {formatShillings(collectionSheet.groupTotalExpected)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Selected Collection Total:</span>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--status-disbursed)" }}>
                  {formatShillings(Object.values(collectionAmounts).reduce((a, b) => a + Number(b || 0), 0))}
                </div>
              </div>
            </div>

            <div style={{ maxHeight: "360px", overflowY: "auto", marginBottom: "20px" }}>
              <table style={{ width: "100%", fontSize: "0.9rem", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px" }}>Member Client</th>
                    <th style={{ padding: "8px 12px" }}>Loan Balance</th>
                    <th style={{ padding: "8px 12px" }}>Expected Due</th>
                    <th style={{ padding: "8px 12px" }}>Collected Amount (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionSheet.members.map((m) => (
                    <tr key={m.clientId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                        {m.clientName}
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{m.phone}</div>
                      </td>
                      <td style={{ padding: "8px 12px" }}>{m.hasActiveLoan ? formatShillings(m.loanBalance) : "No Loan"}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--primary)" }}>
                        {m.hasActiveLoan ? formatShillings(m.expectedInstallment) : "—"}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {m.hasActiveLoan ? (
                          <input
                            type="number"
                            value={collectionAmounts[m.loanId] ?? ""}
                            onChange={(e) => handleAmountChange(m.loanId, e.target.value)}
                            style={{ width: "140px", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                          />
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setCollectionSheet(null)} disabled={isSubmittingBatch}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleBatchCollect} disabled={isSubmittingBatch}>
                {isSubmittingBatch ? "Submitting Group Cash..." : `Submit Batch Collection (${formatShillings(Object.values(collectionAmounts).reduce((a, b) => a + Number(b || 0), 0))})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Collection Success Modal */}
      {batchSuccessResult && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div className="modal-card" style={{ background: "#ffffff", padding: "32px", borderRadius: "12px", maxWidth: "450px", width: "90%", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
              <IconCheck size={28} />
            </div>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--text-main)" }}>Field Group Collection Recorded!</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", margin: "0 0 20px 0" }}>
              Successfully recorded <strong>{batchSuccessResult.collectedCount} client payments</strong> for this group session.
            </p>

            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "4px" }}>Total Cash Collected into Field Bag:</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--status-disbursed)" }}>
                {formatShillings(batchSuccessResult.totalCollected)}
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setBatchSuccessResult(null)}>
              Done & Return to Groups
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Groups;
