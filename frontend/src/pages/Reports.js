import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getAgingReport } from "../services/reportService";
import "../styles/table.css";

const PAGE_SIZE = 10;

function Reports() {
  const [report, setReport] = useState([]);
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getAgingReport();
        if (Array.isArray(data)) setReport(data.filter(Boolean));
      } catch (err) {
        setError(err.message || "Failed to load report");
        setReport([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const exportCSV = () => {
    const header = "Loan ID,Client,Amount,Balance,Due Date,Days Overdue,Bucket,In Arrears\n";
    const rows = filtered.map(r =>
      `${r.id},"${r.clientName}",${r.amount},${r.balance},"${r.dueDate ? new Date(r.dueDate).toLocaleDateString() : ""}",${r.daysOverdue},${r.bucket},${r.inArrears ? "Yes" : "No"}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "aging-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = report.filter(r => {
    const matchSearch = (r.clientName || "").toLowerCase().includes(search.toLowerCase()) ||
      String(r.id).includes(search);
    const matchBucket = bucketFilter === "all" || r.bucket === bucketFilter;
    return matchSearch && matchBucket;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const bucketColors = { CURRENT: "#27ae60", "PAR 30": "#f39c12", "PAR 60": "#e67e22", "PAR 90": "#e74c3c" };

  return (
    <Layout>
      <h2>Aging Report</h2>
      {error && <div className="form-error">{error}</div>}
      {loading && <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Loading report...</p>}
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search by client..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select value={bucketFilter} onChange={(e) => { setBucketFilter(e.target.value); setPage(1); }} className="filter-select">
          <option value="all">All Buckets</option>
          <option value="CURRENT">Current</option>
          <option value="PAR 30">PAR 30</option>
          <option value="PAR 60">PAR 60</option>
          <option value="PAR 90">PAR 90</option>
        </select>
        <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Balance</th>
              <th>Due Date</th>
              <th>Days Overdue</th>
              <th>Bucket</th>
              <th>In Arrears</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.clientName}</td>
                <td>{Number(r.amount).toLocaleString()}</td>
                <td>{Number(r.balance).toLocaleString()}</td>
                <td>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "-"}</td>
                <td>{r.daysOverdue}</td>
                <td><span className="badge" style={{ background: bucketColors[r.bucket] || "#999" }}>{r.bucket}</span></td>
                <td>{r.inArrears ? "Yes" : "No"}</td>
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

export default Reports;
