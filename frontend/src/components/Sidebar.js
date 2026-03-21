import React from "react";
import { Link, useLocation } from "react-router-dom";
import { getUser } from "../services/authService";
import "../styles/sidebar.css";

function Sidebar() {
  const location = useLocation();
  const user = getUser();
  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <div className="sidebar">
      <h3>Loan System</h3>
      <ul>
        <li className={isActive("/dashboard")}><Link to="/dashboard">Dashboard</Link></li>
        <li className={isActive("/clients")}><Link to="/clients">Clients</Link></li>
        <li className={isActive("/loans")}><Link to="/loans">Loans</Link></li>
        <li className={isActive("/repayments")}><Link to="/repayments">Repayments</Link></li>
        <li className={isActive("/audit-logs")}><Link to="/audit-logs">Audit Logs</Link></li>
        <li className={isActive("/reports")}><Link to="/reports">Reports</Link></li>
        {user && user.role === "admin" && (
          <li className={isActive("/users")}><Link to="/users">Users</Link></li>
        )}
      </ul>
    </div>
  );
}

export default Sidebar;