import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import LoanForm from "../components/LoanForm";
import LoanTable from "../components/LoanTable";
import { getLoans, createLoan, approveLoan, rejectLoan, requestLoanRevision, disburseLoan, getLoanSchedule, repayLoan } from "../services/loanService";
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const user = getUser();

  useEffect(() => { fetchLoans(); }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getLoans();
      if (Array.isArray(data)) setLoans(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch loans');
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData) => {
    try {
      setSubmitting(true);
      setError("");
      const loan = {
        clientId: Number(formData.clientId),
        amount: Number(formData.amount),
        interestRate: Number(formData.interestRate),
        termMonths: Number(formData.termMonths),
        guarantorName: formData.guarantorName || undefined,
        notes: formData.notes || undefined,
        documents: formData.documents?.name || undefined,
      };
      await createLoan(loan);
      setShowForm(false);
      await fetchLoans();
    } catch (err) {
      setError(err.message || 'Failed to create loan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    const approvedAmountInput = window.prompt('Enter approved amount or leave blank to approve full requested amount:');
    if (approvedAmountInput === null) return;
    const amount = approvedAmountInput.trim() ? Number(approvedAmountInput.replace(/,/g, '')) : undefined;
    if (approvedAmountInput.trim() && (Number.isNaN(amount) || amount <= 0)) {
      setError('Approved amount must be a valid positive number');
      return;
    }
    const approvalReason = window.prompt('Enter approval note or reason (optional):') || undefined;

    try {
      setSubmitting(true);
      setError("");
      await approveLoan(id, amount, approvalReason);
      await fetchLoans();
    } catch (err) {
      setError(err.message || 'Failed to approve loan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRevision = async (id) => {
    const revisionReason = window.prompt('Enter revision request reason:');
    if (revisionReason === null) return;
    if (!revisionReason.trim()) {
      setError('Revision reason is required');
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await requestLoanRevision(id, revisionReason);
      await fetchLoans();
    } catch (err) {
      setError(err.message || 'Failed to request loan revision');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Reject this loan application?")) return;
    try {
      setSubmitting(true);
      setError("");
      await rejectLoan(id); 
      await fetchLoans();
    } catch (err) {
      setError(err.message || 'Failed to reject loan');
    } finally {
      setSubmitting(false);
    }
  };
  const handleDisburse = async (id) => { 
    try {
      setSubmitting(true);
      setError("");
      await disburseLoan(id); 
      await fetchLoans();
    } catch (err) {
      setError(err.message || 'Failed to disburse loan');
    } finally {
      setSubmitting(false);
    }
  };
  const handlePayInstallment = async (scheduleId, amountDue, status) => {
    let amount = amountDue;
    if (status === 'overdue') {
      amount = amountDue + (amountDue * 0.02);
    }
    if (!window.confirm(`Pay installment of ${amount.toFixed(2)}?`)) return;
    try {
      setSubmitting(true);
      setError("");
      await repayLoan(scheduleLoanId, amount, scheduleId);
      await viewSchedule(scheduleLoanId, { force: true });
      await fetchLoans();
    } catch (err) {
      setError(err.message || 'Failed to record repayment');
    } finally {
      setSubmitting(false);
    }
  };

  const viewSchedule = async (id, options = {}) => {
    if (scheduleLoanId === id && !options.force) {
      setSchedule(null);
      setScheduleLoanId(null);
      return;
    }
    try {
      setError("");
      const data = await getLoanSchedule(id);
      if (Array.isArray(data)) { setSchedule(data); setScheduleLoanId(id); }
    } catch (err) {
      setError(err.message || 'Failed to load repayment schedule');
    }
  };

  const exportCSV = () => {
    const header = "ID,Client,Amount,Approved Amount,Interest,Term,Balance,Status,Note\n";
    const rows = filtered.map(l =>
      `${l.id},"${l.clientName}",${l.amount},${l.approvedAmount || ''},${l.interestRate}%,${l.termMonths},${l.balance},${l.status},"${(l.approvalReason || l.revisionReason || '').replace(/"/g, '""')}"`
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

      {error && <div style={{ padding: '15px', backgroundColor: '#fee', color: '#c33', borderRadius: '4px', marginBottom: '20px' }}>
        ⚠️ {error}
      </div>}

      {loading && <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Loading loans...</p>}

      {!loading && (
        <>
          <div className="toolbar">
            {(user && (user.role === "loan_officer" || user.role === "admin")) && (
              <button onClick={() => setShowForm(!showForm)} disabled={submitting}>
                {showForm ? "Cancel" : "+ New Loan"}
              </button>
            )}
            <input
              className="search-input"
              placeholder="Search by client or ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              disabled={submitting}
            />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="filter-select" disabled={submitting}>
              <option value="all">All Status</option>
              <option value="applied">Applied</option>
              <option value="revision_requested">Pending Revision</option>
              <option value="approved">Approved</option>
              <option value="disbursed">Disbursed</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
          </div>

          {showForm && (
            <LoanForm onSubmit={handleCreate} submitting={submitting} />
          )}

          <LoanTable
            loans={paginated}
            onViewSchedule={viewSchedule}
            onApprove={handleApprove}
            onRequestRevision={handleRequestRevision}
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
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div style={{ padding: '12px', background: '#f4f4f4', borderRadius: '6px' }}>
                  <strong>Total repayment</strong>
                  <div>{schedule.reduce((sum, s) => sum + Number(s.payment), 0).toLocaleString()}</div>
                </div>
                <div style={{ padding: '12px', background: '#f4f4f4', borderRadius: '6px' }}>
                  <strong>Total paid</strong>
                  <div>{schedule.reduce((sum, s) => sum + Number(s.paidAmount || 0), 0).toLocaleString()}</div>
                </div>
                <div style={{ padding: '12px', background: '#f4f4f4', borderRadius: '6px' }}>
                  <strong>Total amount due</strong>
                  <div>{schedule.reduce((sum, s) => sum + Number(s.amountDue || 0), 0).toLocaleString()}</div>
                </div>
                <div style={{ padding: '12px', background: '#f4f4f4', borderRadius: '6px' }}>
                  <strong>Installments</strong>
                  <div>{schedule.length}</div>
                </div>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Due Date</th>
                      <th>Payment</th>
                      <th>Paid</th>
                      <th>Amount Due</th>
                      <th>Principal</th>
                      <th>Interest</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Days Overdue</th>
                      <th>Category</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((s) => (
                      <tr key={s.month}>
                        <td>{s.month}</td>
                        <td>{new Date(s.dueDate).toLocaleDateString()}</td>
                        <td>{Number(s.payment).toLocaleString()}</td>
                        <td>{Number(s.paidAmount || 0).toLocaleString()}</td>
                        <td>{Number(s.amountDue || 0).toLocaleString()}</td>
                        <td>{Number(s.principal).toLocaleString()}</td>
                        <td>{Number(s.interest).toLocaleString()}</td>
                        <td>{Number(s.balance).toLocaleString()}</td>
                        <td>{s.status}</td>
                        <td>{s.daysOverdue || 0}</td>
                        <td>{s.arrearsCategory}</td>
                        <td>
                          {s.status !== 'paid' && (
                            <button className="btn-sm btn-primary" onClick={() => handlePayInstallment(s.id, Number(s.amountDue || s.payment), s.status)} disabled={submitting}>
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
        </>
      )}
    </Layout>
  );
}

export default Loans;
