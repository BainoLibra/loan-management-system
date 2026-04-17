import React from "react";

const LoanTable = ({ loans, onViewSchedule, onApprove, onReject, onDisburse, user }) => {
  const statusColors = {
    applied: "#3498db",
    approved: "#f39c12",
    disbursed: "#27ae60",
    closed: "#95a5a6",
    rejected: "#e74c3c"
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Client</th>
            <th>Amount</th>
            <th>Interest</th>
            <th>Term</th>
            <th>Guarantor</th>
            <th>Notes</th>
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
              <td>{l.guarantorName || "N/A"}</td>
              <td>{l.notes ? l.notes.substring(0, 20) + "..." : "N/A"}</td>
              <td>{Number(l.balance).toLocaleString()}</td>
              <td><span className="badge" style={{ background: statusColors[l.status] || "#999" }}>{l.status}</span></td>
              <td>
                {l.status === "applied" && user && user.role === "admin" && (
                  <>
                    <button className="btn-sm btn-success" onClick={() => onApprove(l.id)}>Approve</button>{" "}
                    <button className="btn-sm btn-danger" onClick={() => onReject(l.id)}>Reject</button>{" "}
                  </>
                )}
                {l.status === "approved" && user && (user.role === "admin" || user.role === "cashier") && (
                  <button className="btn-sm btn-success" onClick={() => onDisburse(l.id)}>Disburse</button>
                )}{" "}
                <button className="btn-sm" onClick={() => onViewSchedule(l.id)}>
                  Schedule
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LoanTable;