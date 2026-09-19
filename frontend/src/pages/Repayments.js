import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getLoans, getRepayments, repayLoan } from "../services/loanService";
import { getUser } from "../services/authService";
import { IconSearch, IconAlert } from "../components/Icons";
import "../styles/table.css";

const PAGE_SIZE = 10;

function Repayments() {
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const user = getUser();
  const canViewRepayments = user && ["admin", "cashier", "loan_officer"].includes(user.role);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getLoans();
      if (Array.isArray(data)) setLoans(data.filter((l) => l.status === "disbursed"));
    } catch (err) {
      setError(err.message || "Failed to load loans");
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const selectLoan = async (loan) => {
    try {
      setError("");
      setSelectedLoan(loan);
      const data = await getRepayments(loan.id);
      if (Array.isArray(data)) setRepayments(data);
    } catch (err) {
      setError(err.message || "Failed to load repayments");
      setRepayments([]);
    }
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    if (!selectedLoan) return;
    const repaymentAmount = Number(amount);
    if (!Number.isFinite(repaymentAmount) || repaymentAmount <= 0) {
      setError("Enter a repayment amount greater than zero.");
      return;
    }
    if (repaymentAmount > Number(selectedLoan.balance)) {
      setError("Repayment cannot exceed the remaining balance.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      await repayLoan(selectedLoan.id, repaymentAmount);
      setAmount("");
      await selectLoan(selectedLoan);
      await fetchLoans();
    } catch (err) {
      setError(err.message || "Failed to record repayment");
    } finally {
      setSubmitting(false);
    }
  };

  const exportCSV = () => {
    if (!repayments.length) return;
    const header = "ID,Amount,Date\n";
    const rows = repayments.map((r) => `${r.id},${r.amount},"${new Date(r.date).toLocaleDateString()}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repayments-loan-${selectedLoan.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = loans.filter((l) => (l.clientName || "").toLowerCase().includes(search.toLowerCase()) || String(l.id).includes(search));

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!canViewRepayments) {
    return (
      <Layout>
        <div className="page-header">
          <div className="page-title-group">
            <h2>Loan Repayments</h2>
          </div>
        </div>
        <div className="form-error">
          <IconAlert size={18} />
          <span>You are not authorized to view repayments. Please contact a cashier or loan officer.</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Loan Repayments & Teller Desk</h2>
          <p>Record installment collections, inspect client ledger balances, and print payment history.</p>
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
            placeholder="Search disbursed loans by borrower name or loan ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="table-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Client Name</th>
                <th>Disbursed Amount</th>
                <th>Remaining Balance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                    Loading active loans...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                    No active disbursed loans found.
                  </td>
                </tr>
              ) : (
                paginated.map((l) => (
                  <tr key={l.id} style={selectedLoan && selectedLoan.id === l.id ? { background: "var(--primary-light)" } : {}}>
                    <td>#{l.id}</td>
                    <td style={{ fontWeight: 600 }}>{l.clientName}</td>
                    <td>${Number(l.amount).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>${Number(l.balance).toLocaleString()}</td>
                    <td>
                      <button className="btn-sm btn-primary" onClick={() => selectLoan(l)} disabled={submitting}>
                        Select Loan
                      </button>
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
            Page {page} of {totalPages} ({filtered.length} total active loans)
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

      {selectedLoan && (
        <div style={{ marginTop: "36px" }}>
          <div className="page-header" style={{ marginBottom: "16px" }}>
            <div className="page-title-group">
              <h3>Teller Entry — Loan #{selectedLoan.id} ({selectedLoan.clientName})</h3>
            </div>
            {repayments.length > 0 && (
              <div className="page-actions">
                <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
                  Export History (CSV)
                </button>
              </div>
            )}
          </div>

          <div className="detail-cards" style={{ marginBottom: "20px" }}>
            <div className="detail-card">
              <label>Original Disbursed</label>
              <span>${Number(selectedLoan.amount).toLocaleString()}</span>
            </div>
            <div className="detail-card">
              <label>Current Outstanding Balance</label>
              <span style={{ color: "var(--primary)", fontWeight: 800 }}>${Number(selectedLoan.balance).toLocaleString()}</span>
            </div>
            <div className="detail-card">
              <label>Payments Recorded</label>
              <span>{repayments.length}</span>
            </div>
          </div>

          <form onSubmit={handleRepay} className="inline-form" style={{ marginBottom: "28px" }}>
            <input
              type="number"
              placeholder="Enter payment amount ($)..."
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={submitting}
              min="0.01"
              step="0.01"
              style={{ minWidth: "260px" }}
            />
            <button className="btn btn-success" type="submit" disabled={submitting}>
              {submitting ? "Processing..." : "Submit Collection"}
            </button>
          </form>

          <div className="page-header" style={{ marginBottom: "12px" }}>
            <div className="page-title-group">
              <h4>Collection History Ledger</h4>
            </div>
          </div>

          <div className="table-card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Receipt ID</th>
                    <th>Payment Amount</th>
                    <th>Date Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {repayments.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                        No payments recorded for this loan yet.
                      </td>
                    </tr>
                  ) : (
                    repayments.map((r) => (
                      <tr key={r.id}>
                        <td>#{r.id}</td>
                        <td style={{ fontWeight: 700, color: "var(--status-disbursed)" }}>${Number(r.amount).toLocaleString()}</td>
                        <td>{new Date(r.date).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Repayments;
