import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ClientTable from "../components/ClientTable";
import { getClients, createClient, updateClient, deleteClient } from "../services/clientService";
import { getGroups } from "../services/groupService";
import { getUser } from "../services/authService";
import "../styles/table.css";

const PAGE_SIZE = 10;

const titleCaseName = (value) => {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : "")
    .join(" ");
};

const sanitizePhoneInput = (value) => {
  const digits = value.replace(/\D/g, "");
  return digits.slice(0, 12);
};

const normalizePhoneNumber = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return `256${digits.slice(1)}`;
  if (/^256\d{9}$/.test(digits)) return digits;
  return digits;
};

const sanitizeIdentifierInput = (value) => {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.slice(0, 14);
};

const validateClientForm = ({ firstName, lastName, phone, identifier, guarantorName, guarantorPhone, guarantorId }) => {
  if (!firstName.trim()) return "First name is required.";
  if (!lastName.trim()) return "Last name is required.";
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(firstName)) return "First name may only contain letters and spaces.";
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(lastName)) return "Last name may only contain letters and spaces.";
  if (phone) {
    if (!/^256\d{9}$/.test(phone)) return "Phone must be in format 256XXXXXXXXX or 07XXXXXXXX.";
  }
  if (identifier) {
    if (!/^[A-Z0-9]{1,14}$/.test(identifier)) return "Identifier must be up to 14 characters of uppercase letters and digits only.";
  }
  if (guarantorName) {
    if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(guarantorName)) return "Guarantor name may only contain letters and spaces.";
  }
  if (guarantorPhone) {
    if (!/^256\d{9}$/.test(guarantorPhone)) return "Guarantor phone must be in format 256XXXXXXXXX or 07XXXXXXXX.";
  }
  if (guarantorId) {
    if (!/^[A-Z0-9]{1,14}$/.test(guarantorId)) return "Guarantor ID must be up to 14 characters of uppercase letters and digits only.";
  }
  return "";
};

function Clients() {
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", identifier: "", address: "", groupId: "", guarantorName: "", guarantorPhone: "", guarantorId: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const user = getUser();
  const isAdmin = user?.role === 'admin';

  useEffect(() => { fetchClients(); fetchGroups(); }, []);

  const fetchClients = async () => {
    try {
      const data = await getClients();
      if (Array.isArray(data)) setClients(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch clients');
      setClients([]);
    }
  };

  const fetchGroups = async () => {
    try {
      const data = await getGroups();
      if (Array.isArray(data)) setGroups(data);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (submitting) return;
    setSubmitting(true);
    const formattedFirstName = titleCaseName(form.firstName);
    const formattedLastName = titleCaseName(form.lastName);
    const formattedGuarantorName = titleCaseName(form.guarantorName);
    const dataToSubmit = {
      ...form,
      firstName: formattedFirstName,
      lastName: formattedLastName,
      phone: normalizePhoneNumber(form.phone),
      guarantorPhone: normalizePhoneNumber(form.guarantorPhone),
      guarantorName: formattedGuarantorName,
      guarantorId: sanitizeIdentifierInput(form.guarantorId),
      identifier: sanitizeIdentifierInput(form.identifier),
      groupId: form.groupId ? Number(form.groupId) : null,
    };

    const validationError = validateClientForm(dataToSubmit);
    if (validationError) {
      setError(validationError);
      setSubmitting(false);
      return;
    }

    try {
      const response = editingId
        ? await updateClient(editingId, dataToSubmit)
        : await createClient(dataToSubmit);

      if (response.error) {
        setError(response.error);
        return;
      }

      setForm({ firstName: "", lastName: "", phone: "", email: "", identifier: "", address: "", groupId: "", guarantorName: "", guarantorPhone: "", guarantorId: "" });
      setShowForm(false);
      setEditingId(null);
      fetchClients();
    } catch (err) {
      setError(err.message || "Failed to save client");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setForm({
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      phone: c.phone || "",
      email: c.email || "",
      identifier: c.identifier || "",
      address: c.address || "",
      groupId: c.groupId || "",
      guarantorName: c.guarantorName || "",
      guarantorPhone: c.guarantorPhone || "",
      guarantorId: c.guarantorId || ""
    });
    setError("");
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this client?")) return;
    try {
      setError("");
      await deleteClient(id);
      fetchClients();
    } catch (err) {
      setError(err.message || "Failed to delete client");
    }
  };

  const exportCSV = () => {
    const header = "ID,First Name,Last Name,Phone,Guarantor Name,Guarantor Phone,Guarantor ID,Email,Address,Identifier,Group\n";
    const rows = filtered.map(c => `${c.id},"${c.firstName || ""}","${c.lastName || ""}","${c.phone || ""}","${c.guarantorName || ""}","${c.guarantorPhone || ""}","${c.guarantorId || ""}","${c.email || ""}","${c.address || ""}","${c.identifier || ""}","${groups.find(g => g.id === c.groupId)?.name || ""}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "clients.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = clients.filter(c => {
    const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
    const groupName = groups.find(g => g.id === c.groupId)?.name || "";
    return fullName.includes(search.toLowerCase()) ||
      (c.phone || "").includes(search) ||
      (c.guarantorName || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.guarantorPhone || "").includes(search) ||
      (c.guarantorId || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.address || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.identifier || "").toLowerCase().includes(search.toLowerCase()) ||
      groupName.toLowerCase().includes(search.toLowerCase())
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout>
      <h2>Clients</h2>
      <div className="toolbar">
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ firstName: "", lastName: "", phone: "", email: "", identifier: "", address: "", groupId: "", guarantorName: "", guarantorPhone: "", guarantorId: "" }); setError(""); }}>
          {showForm ? "Cancel" : "+ New Client"}
        </button>
        <input
          className="search-input"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="inline-form">
          {error && <div className="form-error">{error}</div>}
          <input
            placeholder="First Name"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
            readOnly={!isAdmin && !!editingId}
          />
          <input
            placeholder="Last Name"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
            readOnly={!isAdmin && !!editingId}
          />
          <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
            <option value="">Select Group</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })}
            maxLength={12}
          />
          <input
            placeholder="Guarantor Name"
            value={form.guarantorName}
            onChange={(e) => setForm({ ...form, guarantorName: e.target.value })}
          />
          <input
            placeholder="Guarantor Phone"
            value={form.guarantorPhone}
            onChange={(e) => setForm({ ...form, guarantorPhone: sanitizePhoneInput(e.target.value) })}
            maxLength={12}
          />
          <input
            placeholder="Guarantor ID"
            value={form.guarantorId}
            onChange={(e) => setForm({ ...form, guarantorId: sanitizeIdentifierInput(e.target.value) })}
            maxLength={14}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <input
            placeholder="ID/Identifier"
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: sanitizeIdentifierInput(e.target.value) })}
            maxLength={14}
            readOnly={!isAdmin && !!editingId}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : (editingId ? "Update" : "Save Client")}
          </button>
        </form>
      )}

      <ClientTable
        clients={paginated}
        onEdit={handleEdit}
        onDelete={handleDelete}
        user={user}
      />

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

export default Clients;
