import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ClientTable from "../components/ClientTable";
import { getClients, createClient, updateClient, deleteClient } from "../services/clientService";
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

const sanitizeIdentifierInput = (value) => {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.slice(0, 14);
};

const validateClientForm = ({ name, phone, identifier }) => {
  if (!name.trim()) return "Name is required.";
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(name)) return "Name may only contain letters and spaces.";
  if (phone) {
    if (!/^256\d{9}$/.test(phone)) return "Phone must start with 256 and be 12 digits long.";
  }
  if (identifier) {
    if (!/^[A-Z0-9]{1,14}$/.test(identifier)) return "Identifier must be up to 14 characters of uppercase letters and digits only.";
  }
  return "";
};

function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", identifier: "", address: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const user = getUser();

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    const data = await getClients();
    if (Array.isArray(data)) setClients(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const formattedName = titleCaseName(form.name);
    const dataToSubmit = {
      ...form,
      name: formattedName,
      phone: sanitizePhoneInput(form.phone),
      identifier: sanitizeIdentifierInput(form.identifier),
    };

    const validationError = validateClientForm(dataToSubmit);
    if (validationError) {
      setError(validationError);
      return;
    }

    const response = editingId
      ? await updateClient(editingId, dataToSubmit)
      : await createClient(dataToSubmit);

    if (response.error) {
      setError(response.error);
      return;
    }

    setForm({ name: "", phone: "", email: "", identifier: "", address: "" });
    setShowForm(false);
    setEditingId(null);
    fetchClients();
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone || "", email: c.email || "", identifier: c.identifier || "", address: c.address || "" });
    setError("");
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this client?")) return;
    const res = await deleteClient(id);
    if (res.error) { alert(res.error); return; }
    fetchClients();
  };

  const exportCSV = () => {
    const header = "ID,Name,Phone,Email,Address,Identifier\n";
    const rows = filtered.map(c => `${c.id},"${c.name}","${c.phone || ""}","${c.email || ""}","${c.address || ""}","${c.identifier || ""}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "clients.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.address || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.identifier || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout>
      <h2>Clients</h2>
      <div className="toolbar">
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "", phone: "", email: "", identifier: "", address: "" }); setError(""); }}>
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
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: titleCaseName(e.target.value) })}
            required
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })}
            maxLength={12}
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
          />
          <button type="submit">{editingId ? "Update" : "Save Client"}</button>
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