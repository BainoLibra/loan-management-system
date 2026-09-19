import React from "react";

const LoanTable = ({ loans, onViewSchedule, onApprove, onRequestRevision, onReject, onDisburse, user }) => {
  return (
    <div className="table-card">
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
              <th>Decision / Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                  No loans found.
                </td>
              </tr>
            ) : (
              loans.map((l) => (
                <tr key={l.id}>
                  <td>#{l.id}</td>
                  <td style={{ fontWeight: 600 }}>{l.clientName}</td>
                  <td style={{ fontWeight: 700 }}>${Number(l.amount).toLocaleString()}</td>
                  <td>{l.interestRate}%</td>
                  <td>{l.termMonths} mos</td>
                  <td style={{ fontWeight: 600, color: "var(--text-main)" }}>
                    ${Number(l.balance).toLocaleString()}
                  </td>
                  <td>
                    <span className={`status-badge ${l.status}`}>
                      {l.status ? l.status.replace("_", " ") : "applied"}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.82rem" }}>
                      {l.approvedAmount && (
                        <div style={{ fontWeight: 600, color: "var(--status-approved)" }}>
                          Appr: ${Number(l.approvedAmount).toLocaleString()}
                        </div>
                      )}
                      <span style={{ color: "var(--text-muted)" }}>
                        {l.approvalReason || l.revisionReason || l.notes || "—"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {['applied', 'revision_requested'].includes(l.status) && user && (user.role === "admin" || user.role === "branch_manager") && (
                        <>
                          <button className="btn-sm btn-success" onClick={() => onApprove(l.id)}>
                            Approve
                          </button>
                          <button className="btn-sm btn-warn" onClick={() => onRequestRevision(l.id)}>
                            Revision
                          </button>
                          <button className="btn-sm btn-danger" onClick={() => onReject(l.id)}>
                            Reject
                          </button>
                        </>
                      )}
                      {l.status === "approved" && user && (user.role === "admin" || user.role === "cashier") && (
                        <button className="btn-sm btn-success" onClick={() => onDisburse(l.id)}>
                          Disburse
                        </button>
                      )}
                      <button className="btn-sm btn-secondary" onClick={() => onViewSchedule(l.id)}>
                        Schedule
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LoanTable;