import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getLoans, getRepayments, repayLoan } from "../services/loanService";
import { getUser } from "../services/authService";
import { IconSearch, IconAlert } from "../components/Icons";
import { formatShillings } from "../utils/format";
import "../styles/table.css";

const PAGE_SIZE = 10;

function Repayments() {
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [receiptModalData, setReceiptModalData] = useState(null);
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
      const result = await repayLoan(selectedLoan.id, repaymentAmount, paymentMethod, reference);
      setAmount("");
      setReference("");
      await selectLoan(selectedLoan);
      await fetchLoans();

      // Show receipt modal for the new payment
      setReceiptModalData({
        receiptId: result?.repaymentId || "NEW",
        loanId: selectedLoan.id,
        clientName: selectedLoan.clientName,
        amount: repaymentAmount,
        paymentMethod,
        reference,
        date: new Date().toISOString(),
        paidByName: user?.name || "Staff",
      });
    } catch (err) {
      setError(err.message || "Failed to record repayment");
    } finally {
      setSubmitting(false);
    }
  };

  const exportCSV = () => {
    if (!repayments.length) return;
    const header = "Receipt ID,Amount,Method,Reference,Date,Recorded By\n";
    const rows = repayments.map((r) => `${r.id},${r.amount},"${r.paymentMethod || 'cash'}","${r.reference || ''}","${new Date(r.date).toLocaleDateString()}","${r.paidByName || ''}"`).join("\n");
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
          <p>Record installment collections in Shillings, track payment channels, and print official receipts.</p>
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
                    <td>{formatShillings(l.amount)}</td>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>{formatShillings(l.balance)}</td>
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
              <span>{formatShillings(selectedLoan.amount)}</span>
            </div>
            <div className="detail-card">
              <label>Current Outstanding Balance</label>
              <span style={{ color: "var(--primary)", fontWeight: 800 }}>{formatShillings(selectedLoan.balance)}</span>
            </div>
            <div className="detail-card">
              <label>Payments Recorded</label>
              <span>{repayments.length}</span>
            </div>
          </div>

          <form onSubmit={handleRepay} className="inline-form" style={{ marginBottom: "28px", flexWrap: "wrap", gap: "10px" }}>
            <input
              type="number"
              placeholder="Amount (Shs)..."
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={submitting}
              min="1"
              step="1"
              style={{ minWidth: "200px" }}
            />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={submitting}
              style={{ minWidth: "160px" }}
            >
              <option value="cash">Cash Collection</option>
              <option value="mobile_money">Mobile Money (M-Pesa/MTN)</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
            <input
              type="text"
              placeholder="Ref Code / Trans ID (optional)..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={submitting}
              style={{ minWidth: "220px" }}
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
                    <th>Payment Method</th>
                    <th>Reference Code</th>
                    <th>Date Recorded</th>
                    <th>Collected By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {repayments.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                        No payments recorded for this loan yet.
                      </td>
                    </tr>
                  ) : (
                    repayments.map((r) => (
                      <tr key={r.id}>
                        <td>#{r.id}</td>
                        <td style={{ fontWeight: 700, color: "var(--status-disbursed)" }}>{formatShillings(r.amount)}</td>
                        <td style={{ textTransform: "capitalize" }}>{(r.paymentMethod || "cash").replace("_", " ")}</td>
                        <td>{r.reference || "—"}</td>
                        <td>{new Date(r.date).toLocaleDateString()}</td>
                        <td>{r.paidByName || "Staff"}</td>
                        <td>
                          <button
                            className="btn-sm btn-secondary"
                            onClick={() =>
                              setReceiptModalData({
                                receiptId: r.id,
                                loanId: selectedLoan.id,
                                clientName: selectedLoan.clientName,
                                amount: r.amount,
                                paymentMethod: r.paymentMethod || "cash",
                                reference: r.reference || "",
                                date: r.date,
                                paidByName: r.paidByName || "Staff",
                              })
                            }
                          >
                            Print Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Printable Official Receipt Modal */}
      {receiptModalData && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div className="modal-card" style={{ background: "#ffffff", padding: "32px", borderRadius: "12px", maxWidth: "480px", width: "90%", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <div style={{ borderBottom: "2px solid var(--primary)", paddingBottom: "12px", marginBottom: "20px", textAlign: "center" }}>
              <h2 style={{ margin: 0, color: "var(--primary)" }}>LIBRA LOAN MANAGEMENT</h2>
              <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>Official Payment Receipt</p>
            </div>

            <div style={{ display: "grid", gap: "10px", fontSize: "0.95rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Receipt #:</span>
                <span style={{ fontWeight: 700 }}>#{receiptModalData.receiptId}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Loan ID:</span>
                <span>#{receiptModalData.loanId}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Borrower Name:</span>
                <span style={{ fontWeight: 600 }}>{receiptModalData.clientName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Amount Paid:</span>
                <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "1.1rem" }}>{formatShillings(receiptModalData.amount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Payment Method:</span>
                <span style={{ textTransform: "capitalize" }}>{receiptModalData.paymentMethod.replace("_", " ")}</span>
              </div>
              {receiptModalData.reference && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Reference Code:</span>
                  <span style={{ fontWeight: 600 }}>{receiptModalData.reference}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Date & Time:</span>
                <span>{new Date(receiptModalData.date).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Processed By:</span>
                <span>{receiptModalData.paidByName}</span>
              </div>
            </div>

            <div style={{ marginTop: "28px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setReceiptModalData(null)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Repayments;
