import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import LoanForm from "../components/LoanForm";
import LoanTable from "../components/LoanTable";
import { getLoans, createLoan, approveLoan, rejectLoan, disburseLoan, getLoanSchedule } from "../services/loanService";
import { getClients } from "../services/clientService";
import { getUser } from "../services/authService";
import "../styles/table.css";

const PAGE_SIZE = 10;

function Loans() {
  const [loans, setLoans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoanId, setScheduleLoanId] = useState(null);
  const user = getUser();

  useEffect(() => { fetchLoans(); }, []);

  const fetchLoans = async () => {
    const data = await getLoans();
    if (Array.isArray(data)) setLoans(data);
  };

  const handleCreate = async (formData) => {
    await createLoan({
      clientId: Number(formData.clientId),
      amount: Number(formData.amount),
      interestRate: Number(formData.interestRate),
      termMonths: Number(formData.termMonths),
      guarantorName: formData.guarantorName,
      notes: formData.notes,
      documents: formData.documents, // handle file upload later
    });
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
        <LoanForm onSubmit={handleCreate} />
      )}

      <LoanTable
        loans={paginated}
        onViewSchedule={viewSchedule}
        onApprove={handleApprove}
        onReject={handleReject}
        onDisburse={handleDisburse}
        user={user}
      />

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