import React from "react";
import { Link, useLocation } from "react-router-dom";
import { getUser } from "../services/authService";
import "../styles/sidebar.css";

function Sidebar({ isOpen, onChangePassword }) {
  const location = useLocation();
  const user = getUser();
  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
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
        <li className="change-password">
          <button type="button" onClick={onChangePassword}>Change Password</button>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;