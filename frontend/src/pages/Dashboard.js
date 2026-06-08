import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getLoans } from "../services/loanService";
import { getClients } from "../services/clientService";
import { getUser } from "../services/authService";
import { getDashboardSummary } from "../services/reportService";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import "../styles/table.css";

const STATUS_COLORS = {
  applied: "#3498db",
  approved: "#f39c12",
  disbursed: "#27ae60",
  closed: "#95a5a6",
  rejected: "#e74c3c",
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

        if (summaryResult.status === 'rejected') {
          console.warn('Dashboard summary failed, showing core loan data instead:', summaryResult.reason);
        }

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
      <h2>Dashboard</h2>
      <p>Welcome, {user ? user.name : "User"}!</p>
      <p style={{ color: '#555', marginTop: 0, marginBottom: 20 }}>
        To apply for a loan, go to the Loans page. If there are no clients yet, create clients first under Clients.
      </p>

      {error && <div style={{ padding: '15px', backgroundColor: '#fee', color: '#c33', borderRadius: '4px', marginBottom: '20px' }}>
        ⚠️ {error}
      </div>}

      {loading && <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Loading dashboard...</p>}

      {!loading && (
        <>
          <div className="stat-cards">
            <div className="stat-card"><h3>{stats.clients}</h3><p>Clients</p></div>
            <div className="stat-card"><h3>{stats.loans}</h3><p>Total Loans</p></div>
            <div className="stat-card"><h3>{stats.disbursed}</h3><p>Active (Disbursed)</p></div>
            <div className="stat-card"><h3>{stats.totalBalance.toLocaleString()}</h3><p>Outstanding Balance</p></div>
          </div>

          <div className="chart-row">
            <div className="chart-box">
              <h4>Loan Status Breakdown</h4>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#999"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: "#999" }}>No loan data yet</p>
              )}
            </div>

            <div className="chart-box">
              <h4>Monthly Disbursements (Last 6 Months)</h4>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v) => Number(v).toLocaleString()} />
                    <Bar dataKey="amount" fill="#3498db" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: "#999" }}>No disbursement data yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

export default Dashboard;