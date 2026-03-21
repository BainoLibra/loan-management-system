import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getLoans, createLoan, approveLoan, disburseLoan } from "../services/loanService";
import { getClients } from "../services/clientService";
import { getUser } from "../services/authService";
import "../styles/table.css";

function Loans() {
  const [loans, setLoans] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientId: "", amount: "", interestRate: "", termMonths: "" });
  const user = getUser();

  useEffect(() => {
    fetchLoans();
    fetchClients();
  }, []);

  const fetchLoans = async () => {
    const data = await getLoans();
    if (Array.isArray(data)) setLoans(data);
  };

  const fetchClients = async () => {
    const data = await getClients();
    if (Array.isArray(data)) setClients(data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await createLoan({
      clientId: Number(form.clientId),
      amount: Number(form.amount),
      interestRate: Number(form.interestRate),
      termMonths: Number(form.termMonths),
    });
    setForm({ clientId: "", amount: "", interestRate: "", termMonths: "" });
    setShowForm(false);
    fetchLoans();
  };

  const handleApprove = async (id) => {
    await approveLoan(id);
    fetchLoans();
  };

  const handleDisburse = async (id) => {
    await disburseLoan(id);
    fetchLoans();
  };

  return (
    <Layout>
      <h2>Loans</h2>
      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: 10 }}>
        {showForm ? "Cancel" : "+ New Loan"}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} style={{ marginBottom: 20 }}>
          <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
            <option value="">Select Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <input type="number" step="0.01" placeholder="Interest Rate (%)" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} required />
          <input type="number" placeholder="Term (months)" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} required />
          <button type="submit">Create Loan</button>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Client</th>
            <th>Amount</th>
            <th>Interest</th>
            <th>Term</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((l) => (
            <tr key={l.id}>
              <td>{l.id}</td>
              <td>{l.clientName}</td>
              <td>{Number(l.amount).toLocaleString()}</td>
              <td>{l.interestRate}%</td>
              <td>{l.termMonths}m</td>
              <td>{Number(l.balance).toLocaleString()}</td>
              <td>{l.status}</td>
              <td>
                {l.status === "applied" && user && (user.role === "admin") && (
                  <button onClick={() => handleApprove(l.id)}>Approve</button>
                )}
                {l.status === "approved" && user && (user.role === "admin" || user.role === "cashier") && (
                  <button onClick={() => handleDisburse(l.id)}>Disburse</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}

export default Loans;