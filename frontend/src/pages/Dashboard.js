import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getLoans } from "../services/loanService";
import { getClients } from "../services/clientService";
import { getUser } from "../services/authService";

function Dashboard() {
  const [stats, setStats] = useState({ loans: 0, clients: 0, disbursed: 0, totalBalance: 0 });
  const user = getUser();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [loans, clients] = await Promise.all([getLoans(), getClients()]);
        const loansArr = Array.isArray(loans) ? loans : [];
        const clientsArr = Array.isArray(clients) ? clients : [];
        setStats({
          loans: loansArr.length,
          clients: clientsArr.length,
          disbursed: loansArr.filter((l) => l.status === "disbursed").length,
          totalBalance: loansArr.reduce((sum, l) => sum + (l.balance || 0), 0),
        });
      } catch {
        /* dashboard is best-effort */
      }
    };
    fetchStats();
  }, []);

  return (
    <Layout>
      <h2>Dashboard</h2>
      <p>Welcome, {user ? user.name : "User"}!</p>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 20 }}>
        <div style={cardStyle}><h3>{stats.clients}</h3><p>Clients</p></div>
        <div style={cardStyle}><h3>{stats.loans}</h3><p>Total Loans</p></div>
        <div style={cardStyle}><h3>{stats.disbursed}</h3><p>Active (Disbursed)</p></div>
        <div style={cardStyle}><h3>{stats.totalBalance.toLocaleString()}</h3><p>Outstanding Balance</p></div>
      </div>
    </Layout>
  );
}

const cardStyle = {
  background: "#f5f5f5",
  padding: "20px 30px",
  borderRadius: 8,
  minWidth: 150,
  textAlign: "center",
};

export default Dashboard;