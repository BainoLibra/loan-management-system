import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getLoans, createLoan, approveLoan, rejectLoan, disburseLoan, getLoanSchedule } from "../services/loanService";
import { getClients } from "../services/clientService";
import { getUser } from "../services/authService";
import "../styles/table.css";

const PAGE_SIZE = 10;

function Loans() {
  const [loans, setLoans] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientId: "", amount: "", interestRate: "1.5", termMonths: "6" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoanId, setScheduleLoanId] = useState(null);
  const user = getUser();

  useEffect(() => { fetchLoans(); fetchClients(); }, []);

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
    setForm({ clientId: "", amount: "", interestRate: "1.5", termMonths: "6" });
    setShowForm(false);
    fetchLoans();
  };

  const handleApprove = async (id) => { await approveLoan(id); fetchLoans(); };
  const handleReject = async (id) => {
    if (!window.confirm("Reject this loan application?")) return;
    await rejectLoan(id); fetchLoans();
  };
  const handlePayInstallment = async (scheduleId, payment, status) => {
    let amount = payment;
    if (status === 'overdue') {
      amount = payment + (payment * 0.02);
    }
    if (!window.confirm(`Pay installment of ${amount.toFixed(2)}?`)) return;
    await repayLoan(scheduleLoanId, amount, scheduleId);
    viewSchedule(scheduleLoanId); // refresh schedule
    fetchLoans(); // refresh loans list
  };

  const viewSchedule = async (id) => {
    if (scheduleLoanId === id) { setSchedule(null); setScheduleLoanId(null); return; }
    const data = await getLoanSchedule(id);
    if (Array.isArray(data)) { setSchedule(data); setScheduleLoanId(id); }
  };

  const exportCSV = () => {
    const header = "ID,Client,Amount,Interest,Term,Balance,Status\n";
    const rows = filtered.map(l =>
      `${l.id},"${l.clientName}",${l.amount},${l.interestRate}%,${l.termMonths},${l.balance},${l.status}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "loans.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = loans.filter(l => {
    const matchSearch = (l.clientName || "").toLowerCase().includes(search.toLowerCase()) ||
      String(l.id).includes(search);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statusColors = { applied: "#3498db", approved: "#f39c12", disbursed: "#27ae60", closed: "#95a5a6", rejected: "#e74c3c" };

  return (
    <Layout>
      <h2>Loans</h2>
      <div className="toolbar">
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Loan"}
        </button>
        <input
          className="search-input"
          placeholder="Search by client or ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="filter-select">
          <option value="all">All Status</option>
          <option value="applied">Applied</option>
          <option value="approved">Approved</option>
          <option value="disbursed">Disbursed</option>
          <option value="closed">Closed</option>
          <option value="rejected">Rejected</option>
        </select>
        <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="inline-form">
          <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
            <option value="">Select Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input type="number" placeholder="Amount" min="300000" max="2000000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <input type="number" step="0.01" placeholder="Interest Rate (%)" value={form.interestRate} readOnly />
          <input type="number" placeholder="Term (months)" value={form.termMonths} readOnly />
          <button type="submit">Create Loan</button>
        </form>
      )}

      <div className="table-container">
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
            {paginated.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>{l.clientName}</td>
                <td>{Number(l.amount).toLocaleString()}</td>
                <td>{l.interestRate}%</td>
                <td>{l.termMonths}m</td>
                <td>{Number(l.balance).toLocaleString()}</td>
                <td><span className="badge" style={{ background: statusColors[l.status] || "#999" }}>{l.status}</span></td>
                <td>
                  {l.status === "applied" && user && user.role === "admin" && (
                    <>
                      <button className="btn-sm btn-success" onClick={() => handleApprove(l.id)}>Approve</button>{" "}
                      <button className="btn-sm btn-danger" onClick={() => handleReject(l.id)}>Reject</button>{" "}
                    </>
                  )}
                  {l.status === "approved" && user && (user.role === "admin" || user.role === "cashier") && (
                    <button className="btn-sm btn-success" onClick={() => handleDisburse(l.id)}>Disburse</button>
                  )}{" "}
                  <button className="btn-sm" onClick={() => viewSchedule(l.id)}>
                    {scheduleLoanId === l.id ? "Hide" : "Schedule"}
                  </button>
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

      {schedule && (
        <div style={{ marginTop: 20 }}>
          <h3>Repayment Schedule - Loan #{scheduleLoanId}</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Due Date</th>
                  <th>Payment</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((s) => (
                  <tr key={s.month}>
                    <td>{s.month}</td>
                    <td>{new Date(s.dueDate).toLocaleDateString()}</td>
                    <td>{Number(s.payment).toLocaleString()}</td>
                    <td>{Number(s.principal).toLocaleString()}</td>
                    <td>{Number(s.interest).toLocaleString()}</td>
                    <td>{Number(s.balance).toLocaleString()}</td>
                    <td>{s.status}</td>
                    <td>
                      {s.status !== 'paid' && (
                        <button className="btn-sm btn-primary" onClick={() => handlePayInstallment(s.id, s.payment, s.status)}>
                          Pay Installment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Loans;