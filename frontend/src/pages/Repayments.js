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

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    const data = await getLoans();
    if (Array.isArray(data)) setLoans(data.filter((l) => l.status === "disbursed"));
  };

  const selectLoan = async (loan) => {
    setSelectedLoan(loan);
    const data = await getRepayments(loan.id);
    if (Array.isArray(data)) setRepayments(data);
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    if (!selectedLoan) return;
    await repayLoan(selectedLoan.id, Number(amount));
    setAmount("");
    selectLoan(selectedLoan);
    fetchLoans();
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

      <h3>Disbursed Loans</h3>
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search by client or loan ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
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
              <td><button className="btn-sm" onClick={() => selectLoan(l)}>Select</button></td>
            </tr>
          ))}
        </tbody>
      </table>

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
            <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <button type="submit">Pay</button>
          </form>

          <div className="toolbar">
            <h3 style={{ margin: 0 }}>Payment History</h3>
            {repayments.length > 0 && (
              <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
            )}
          </div>
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
        </>
      )}
    </Layout>
  );
}

export default Repayments;