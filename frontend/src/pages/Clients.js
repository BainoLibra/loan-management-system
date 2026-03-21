import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getClients, createClient } from "../services/clientService";
import "../styles/table.css";

function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", identifier: "" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const data = await getClients();
    if (Array.isArray(data)) setClients(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createClient(form);
    setForm({ name: "", phone: "", email: "", identifier: "" });
    setShowForm(false);
    fetchClients();
  };

  return (
    <Layout>
      <h2>Clients</h2>
      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: 10 }}>
        {showForm ? "Cancel" : "+ New Client"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="ID/Identifier" value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} />
          <button type="submit">Save Client</button>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Identifier</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.name}</td>
              <td>{c.phone}</td>
              <td>{c.email}</td>
              <td>{c.identifier}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}

export default Clients;