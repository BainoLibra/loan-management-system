import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getAuditLogs } from "../services/auditService";
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
    const rows = filtered.map(log =>
      `${log.id},"${log.userName || ""}","${log.action}","${log.entity}",${log.entityId},"${new Date(log.createdAt).toLocaleString()}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit-logs.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = logs.filter(log =>
    (log.userName || "").toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    (log.entity || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout>
      <h2>Audit Logs</h2>
      {error && <div className="form-error">{error}</div>}
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search logs..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((log) => (
              <tr key={log.id}>
                <td>{log.id}</td>
                <td>{log.userName}</td>
                <td>{log.action}</td>
                <td>{log.entity}</td>
                <td>{log.entityId}</td>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
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
    </Layout>
  );
}

export default AuditLogs;