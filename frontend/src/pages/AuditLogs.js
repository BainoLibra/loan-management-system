import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getAuditLogs } from "../services/auditService";
import { IconSearch, IconAlert } from "../components/Icons";
import "../styles/table.css";

const PAGE_SIZE = 15;

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getAuditLogs();
        if (Array.isArray(data)) setLogs(data);
      } catch (err) {
        setError(err.message || "Failed to load audit logs");
      }
    };
    fetchLogs();
  }, []);

  const exportCSV = () => {
    const header = "ID,User,Action,Entity,Entity ID,Date\n";
    const rows = filtered
      .map(
        (log) =>
          `${log.id},"${log.userName || ""}","${log.action}","${log.entity}",${log.entityId},"${new Date(log.createdAt).toLocaleString()}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = logs.filter(
    (log) =>
      (log.userName || "").toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.entity || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout>
      <div className="page-header">
        <div className="page-title-group">
          <h2>System Audit Trail</h2>
          <p>Inspect immutable activity logs for security, loan approvals, repayments, and user account actions.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={exportCSV} disabled={logs.length === 0}>
            Export CSV
          </button>
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
            placeholder="Search audit trail by user, action, or entity..."
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
                <th>ID</th>
                <th>Actor / User</th>
                <th>Action Performed</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                paginated.map((log) => (
                  <tr key={log.id}>
                    <td>#{log.id}</td>
                    <td style={{ fontWeight: 600 }}>{log.userName || "System"}</td>
                    <td>
                      <span className="badge badge-admin">{log.action}</span>
                    </td>
                    <td>{log.entity}</td>
                    <td>#{log.entityId}</td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
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
            Page {page} of {totalPages} ({filtered.length} total logs)
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
    </Layout>
  );
}

export default AuditLogs;