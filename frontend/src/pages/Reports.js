import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getAgingReport } from "../services/reportService";
import { getUser } from "../services/authService";
import { IconSearch, IconAlert } from "../components/Icons";
import "../styles/table.css";

const PAGE_SIZE = 10;

function Reports() {
  const [report, setReport] = useState([]);
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const user = getUser();
  const canViewReports = user && ["admin", "cashier", "loan_officer", "branch_manager"].includes(user.role);

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
    const rows = filtered
      .map(
        (r) =>
          `${r.id},"${r.clientName}",${r.amount},${r.balance},"${r.dueDate ? new Date(r.dueDate).toLocaleDateString() : ""}",${r.daysOverdue},${
            r.bucket
          },${r.inArrears ? "Yes" : "No"}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aging-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = report.filter((r) => {
    const matchSearch = (r.clientName || "").toLowerCase().includes(search.toLowerCase()) || String(r.id).includes(search);
    const matchBucket = bucketFilter === "all" || r.bucket === bucketFilter;
    return matchSearch && matchBucket;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!canViewReports) {
    return (
      <Layout>
        <div className="page-header">
          <div className="page-title-group">
            <h2>Portfolio Aging & Financial Reports</h2>
          </div>
        </div>
        <div className="form-error">
          <IconAlert size={18} />
          <span>You are not authorized to view aging reports. Please contact a loan officer or manager.</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Portfolio Aging Analysis</h2>
          <p>Monitor portfolio risk at risk (PAR 30, PAR 60, PAR 90) and overdue loan risk classification.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={exportCSV} disabled={report.length === 0}>
            Export Report (CSV)
          </button>
        </div>
      </div>

      {error && (
        <div className="form-error">
          <IconAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="detail-cards" style={{ marginBottom: "24px" }}>
        <div className="detail-card">
          <label>Total Active Portfolio</label>
          <span>{report.length} Loans</span>
        </div>
        <div className="detail-card">
          <label>PAR 30 At Risk</label>
          <span style={{ color: "var(--status-approved)" }}>
            {report.filter((r) => r.bucket === "PAR 30").length} Loans
          </span>
        </div>
        <div className="detail-card">
          <label>PAR 90+ Severe Risk</label>
          <span style={{ color: "var(--status-rejected)" }}>
            {report.filter((r) => r.bucket === "PAR 90").length} Loans
          </span>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-input-wrapper">
          <IconSearch className="search-input-icon" size={16} />
          <input
            className="search-input"
            placeholder="Search by client name or loan ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          value={bucketFilter}
          onChange={(e) => {
            setBucketFilter(e.target.value);
            setPage(1);
          }}
          className="filter-select"
        >
          <option value="all">All Risk Buckets</option>
          <option value="CURRENT">Current (Healthy)</option>
          <option value="PAR 30">PAR 30 (Watch)</option>
          <option value="PAR 60">PAR 60 (Substandard)</option>
          <option value="PAR 90">PAR 90 (Doubtful / Loss)</option>
        </select>
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
                <th>Due Date</th>
                <th>Days Overdue</th>
                <th>Risk Bucket</th>
                <th>In Arrears</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                    Generating portfolio aging calculations...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                    No report data available yet. Disburse loans to populate the aging report.
                  </td>
                </tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td style={{ fontWeight: 600 }}>{r.clientName}</td>
                    <td>${Number(r.amount).toLocaleString()}</td>
                    <td style={{ fontWeight: 700 }}>${Number(r.balance).toLocaleString()}</td>
                    <td>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}</td>
                    <td style={{ fontWeight: 600, color: r.daysOverdue > 0 ? "var(--status-rejected)" : "var(--text-main)" }}>
                      {r.daysOverdue} days
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          r.bucket === "CURRENT" ? "disbursed" : r.bucket === "PAR 30" ? "approved" : "rejected"
                        }`}
                      >
                        {r.bucket}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: r.inArrears ? "var(--status-rejected)" : "var(--status-disbursed)" }}>
                      {r.inArrears ? "Yes" : "No"}
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
            Page {page} of {totalPages} ({filtered.length} total entries)
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

export default Reports;
