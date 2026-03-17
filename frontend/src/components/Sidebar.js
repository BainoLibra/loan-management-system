import React from "react";
import { Link } from "react-router-dom";
import "../styles/sidebar.css";

function Sidebar() {
  return (
    <div className="sidebar">
      <h3>Loan System</h3>

      <ul>
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/clients">Clients</Link></li>
        <li><Link to="/loans">Loans</Link></li>
        <li><Link to="/repayments">Repayments</Link></li>
        <li><Link to="/audit-logs">Audit Logs</Link></li>
        <li><Link to="/reports">Reports</Link></li>
      </ul>
    </div>
  );
}

export default Sidebar;