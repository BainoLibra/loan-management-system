import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { getClientById } from "../services/clientService";
import { getRepayments } from "../services/loanService";
import "../styles/table.css";

function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);

  useEffect(() => {
    const fetchClient = async () => {
      const data = await getClientById(id);
      if (data && !data.error) {
        setClient(data);
        setLoans(data.loans || []);
      }
    };
    fetchClient();
  }, [id]);

  const viewRepayments = async (loan) => {
    if (selectedLoan && selectedLoan.id === loan.id) {
      setSelectedLoan(null);
      setRepayments([]);
      return;
    }
    setSelectedLoan(loan);
    const data = await getRepayments(loan.id);
    if (Array.isArray(data)) setRepayments(data);
  };

  if (!client) return <Layout><p>Loading...</p></Layout>;

  const totalLoaned = loans.reduce((s, l) => s + Number(l.amount), 0);
  const totalBalance = loans.reduce((s, l) => s + Number(l.balance), 0);
  const activeLoans = loans.filter(l => l.status === "disbursed").length;

  return (
    <Layout>
      <Link to="/clients" style={{ color: "#3498db", textDecoration: "none" }}>&larr; Back to Clients</Link>
      <h2 style={{ marginTop: 10 }}>{client.firstName} {client.lastName}</h2>

      <div className="detail-cards">
        <div className="detail-card">
          <label>Phone</label>
          <span>{client.phone || "-"}</span>
        </div>
        <div className="detail-card">
          <label>Email</label>
          <span>{client.email || "-"}</span>
        </div>
        <div className="detail-card">
          <label>Guarantor</label>
          <span>{client.guarantorName || "-"}</span>
        </div>
        <div className="detail-card">
          <label>Guarantor Phone</label>
          <span>{client.guarantorPhone || "-"}</span>
        </div>
        <div className="detail-card">
          <label>Guarantor ID</label>
          <span>{client.guarantorId || "-"}</span>
        </div>
        <div className="detail-card">
          <label>Identifier</label>
          <span>{client.identifier || "-"}</span>
        </div>
        <div className="detail-card">
          <label>Total Loaned</label>
          <span>{totalLoaned.toLocaleString()}</span>
        </div>
        <div className="detail-card">
          <label>Outstanding</label>
          <span>{totalBalance.toLocaleString()}</span>
        </div>
        <div className="detail-card">
          <label>Active Loans</label>
          <span>{activeLoans}</span>
        </div>
      </div>

      <h3 style={{ marginTop: 20 }}>Loan History</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Amount</th>
              <th>Interest</th>
              <th>Term</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Applied</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loans.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>{Number(l.amount).toLocaleString()}</td>
                <td>{l.interestRate}%</td>
                <td>{l.termMonths}m</td>
                <td>{Number(l.balance).toLocaleString()}</td>
                <td>{l.status}</td>
                <td>{l.appliedAt ? new Date(l.appliedAt).toLocaleDateString() : "-"}</td>
                <td>
                  {(l.status === "disbursed" || l.status === "closed") && (
                    <button className="btn-sm" onClick={() => viewRepayments(l)}>
                      {selectedLoan && selectedLoan.id === l.id ? "Hide" : "Payments"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLoan && (
        <div style={{ marginTop: 20 }}>
          <h3>Payments for Loan #{selectedLoan.id}</h3>
          {repayments.length === 0 ? (
            <p>No payments recorded yet.</p>
          ) : (
            <div className="table-container">
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
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

export default ClientDetail;
