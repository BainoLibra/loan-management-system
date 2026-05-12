import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getLoans, getRepayments, repayLoan } from "../services/loanService";
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
    const rows = repayments.map(r =>
      `${r.id},${r.amount},"${new Date(r.date).toLocaleDateString()}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `repayments-loan-${selectedLoan.id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = loans.filter(l =>
    (l.clientName || "").toLowerCase().includes(search.toLowerCase()) ||
    String(l.id).includes(search)
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout>
      <h2>Repayments</h2>
      {error && <div className="form-error">{error}</div>}

      <h3>Disbursed Loans</h3>
      {loading && <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Loading loans...</p>}
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search by client or loan ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((l) => (
              <tr key={l.id} style={selectedLoan && selectedLoan.id === l.id ? { background: "#e0f0ff" } : {}}>
                <td>{l.id}</td>
                <td>{l.clientName}</td>
                <td>{Number(l.amount).toLocaleString()}</td>
                <td>{Number(l.balance).toLocaleString()}</td>
                <td><button className="btn-sm" onClick={() => selectLoan(l)} disabled={submitting}>Select</button></td>
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

      {selectedLoan && (
        <>
          <h3 style={{ marginTop: 20 }}>Make Repayment for Loan #{selectedLoan.id}</h3>
          <form onSubmit={handleRepay} className="inline-form">
            <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required disabled={submitting} />
            <button type="submit" disabled={submitting}>{submitting ? "Paying..." : "Pay"}</button>
          </form>

          <div className="toolbar">
            <h3 style={{ margin: 0 }}>Payment History</h3>
            {repayments.length > 0 && (
              <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
            )}
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>ID</th><th>Amount</th><th>Date</th></tr>
              </thead>
              <tbody>
                {repayments.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: "center", color: "#999" }}>No payments recorded yet</td></tr>
                ) : repayments.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{Number(r.amount).toLocaleString()}</td>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}

export default Repayments;
