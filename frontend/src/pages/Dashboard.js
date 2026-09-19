import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { getLoans } from "../services/loanService";
import { getClients } from "../services/clientService";
import { getUser } from "../services/authService";
import { formatShillings } from "../utils/format";
import { getDashboardSummary } from "../services/reportService";
import {
  IconClients,
  IconLoans,
  IconPlus,
  IconAlert,
  IconScale
} from "../components/Icons";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";
import "../styles/table.css";

const STATUS_COLORS = {
  applied: "#2563eb",
  approved: "#d97706",
  disbursed: "#059669",
  closed: "#475569",
  rejected: "#dc2626",
};

function Dashboard() {
  const [stats, setStats] = useState({ loans: 0, clients: 0, disbursed: 0, totalBalance: 0 });
  const [statusData, setStatusData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError("");

        const [loansResult, clientsResult, summaryResult] = await Promise.allSettled([
          getLoans(),
          getClients(),
          getDashboardSummary(),
        ]);

        const loansArr = loansResult.status === 'fulfilled' && Array.isArray(loansResult.value) ? loansResult.value : [];
        const clientsArr = clientsResult.status === 'fulfilled' && Array.isArray(clientsResult.value) ? clientsResult.value : [];
        const dashboardSummary = summaryResult.status === 'fulfilled' ? summaryResult.value : null;

        const errors = [];
        if (loansResult.status === 'rejected') errors.push('loan data');
        if (clientsResult.status === 'rejected') errors.push('client data');
        if (summaryResult.status === 'rejected') errors.push('dashboard summary');

        if (errors.length > 0) {
          console.warn('Dashboard fetch partial failure:', {
            loans: loansResult.status === 'rejected' ? loansResult.reason : null,
            clients: clientsResult.status === 'rejected' ? clientsResult.reason : null,
            summary: summaryResult.status === 'rejected' ? summaryResult.reason : null,
          });
          setError(`Unable to load ${errors.join(' and ')}. Some dashboard numbers may be incomplete.`);
        } else {
          setError('');
        }

        const defaultDisbursed = loansArr.filter((l) => l.status === 'disbursed').length;
        const defaultBalance = loansArr.reduce((sum, l) => sum + Number(l.balance || 0), 0);

        setStats({
          loans: loansArr.length,
          clients: clientsArr.length,
          disbursed: dashboardSummary?.totalActiveLoans ?? defaultDisbursed,
          totalBalance: dashboardSummary?.portfolioOutstanding ?? defaultBalance,
        });

        // Loan status breakdown for pie chart
        const counts = {};
        loansArr.forEach((l) => {
          counts[l.status] = (counts[l.status] || 0) + 1;
        });
        setStatusData(
          Object.entries(counts).map(([name, value]) => ({ name, value }))
        );

        // Monthly disbursement amounts (last 6 months)
        const monthly = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
          monthly[key] = 0;
        }
        loansArr
          .filter((l) => l.status === "disbursed" || l.status === "closed")
          .forEach((l) => {
            const d = new Date(l.disbursedAt || l.createdAt);
            const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
            if (key in monthly) {
              monthly[key] += Number(l.amount || 0);
            }
          });
        setMonthlyData(
          Object.entries(monthly).map(([month, amount]) => ({ month, amount }))
        );
      } catch (err) {
        console.error('Dashboard error:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Dashboard Overview</h2>
          <p>Welcome back, <strong>{user ? user.name : "User"}</strong>! Here is your loan portfolio performance summary.</p>
        </div>
        <div className="page-actions">
          <Link to="/loans" className="btn btn-sm">
            <IconPlus size={16} />
            <span>Apply for Loan</span>
          </Link>
          <Link to="/clients" className="btn btn-secondary btn-sm">
            <IconPlus size={16} />
            <span>New Client</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="form-error">
          <IconAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <p>Loading portfolio analytics...</p>
        </div>
      ) : (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-card-header">
                <p>Total Clients</p>
                <div className="stat-card-icon blue">
                  <IconClients size={22} />
                </div>
              </div>
              <h3>{stats.clients.toLocaleString()}</h3>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <p>Total Applications</p>
                <div className="stat-card-icon purple">
                  <IconLoans size={22} />
                </div>
              </div>
              <h3>{stats.loans.toLocaleString()}</h3>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <p>Active Loans (Disbursed)</p>
                <div className="stat-card-icon emerald">
                  <IconScale size={22} />
                </div>
              </div>
              <h3>{stats.disbursed.toLocaleString()}</h3>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <p>Outstanding Balance</p>
                <div
                  className="stat-card-icon amber"
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    color: "var(--text-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  UGX
                </div>
              </div>
              <h3>{formatShillings(stats.totalBalance)}</h3>
            </div>
          </div>

          <div className="chart-row">
            <div className="chart-box">
              <h4>Loan Status Breakdown</h4>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={45}
                      paddingAngle={4}
                      label
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: "var(--text-subtle)", textAlign: "center", padding: "40px 0" }}>No loan data recorded yet</p>
              )}
            </div>

            <div className="chart-box">
              <h4>Monthly Disbursements (Last 6 Months)</h4>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip formatter={(v) => formatShillings(v)} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: "var(--text-subtle)", textAlign: "center", padding: "40px 0" }}>No disbursement history yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

export default Dashboard;