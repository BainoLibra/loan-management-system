import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getLoans, getRepayments, repayLoan } from "../services/loanService";
import "../styles/table.css";

function Repayments() {
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [amount, setAmount] = useState("");

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

  return (
    <Layout>
      <h2>Repayments</h2>

      <h3>Disbursed Loans</h3>
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
          {loans.map((l) => (
            <tr key={l.id} style={selectedLoan && selectedLoan.id === l.id ? { background: "#e0f0ff" } : {}}>
              <td>{l.id}</td>
              <td>{l.clientName}</td>
              <td>{Number(l.amount).toLocaleString()}</td>
              <td>{Number(l.balance).toLocaleString()}</td>
              <td><button onClick={() => selectLoan(l)}>Select</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedLoan && (
        <>
          <h3>Make Repayment for Loan #{selectedLoan.id}</h3>
          <form onSubmit={handleRepay} style={{ marginBottom: 20 }}>
            <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <button type="submit">Pay</button>
          </form>

          <h3>Payment History</h3>
          <table>
            <thead>
              <tr><th>ID</th><th>Amount</th><th>Date</th></tr>
            </thead>
            <tbody>
              {repayments.map((r) => (
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