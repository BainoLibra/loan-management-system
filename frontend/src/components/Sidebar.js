import React from "react";
import { Link, useLocation } from "react-router-dom";
import { getUser } from "../services/authService";
import {
  IconDashboard,
  IconClients,
  IconGroups,
  IconLoans,
  IconRepayments,
  IconReports,
  IconAudit,
  IconUsers,
  IconLock,
  IconScale
} from "./Icons";
import "../styles/sidebar.css";

function Sidebar({ isOpen, onChangePassword }) {
  const location = useLocation();
  const user = getUser();
  const isActive = (path) => (location.pathname === path ? "nav-item active" : "nav-item");

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-icon">
          <IconScale size={22} color="#ffffff" />
        </div>
        <span className="brand-title">Libra Loan</span>
      </div>

      <ul className="sidebar-nav">
        <li className={isActive("/dashboard")}>
          <Link to="/dashboard">
            <IconDashboard size={18} />
            <span>Dashboard</span>
          </Link>
        </li>
        <li className={isActive("/clients")}>
          <Link to="/clients">
            <IconClients size={18} />
            <span>Clients</span>
          </Link>
        </li>
        <li className={isActive("/groups")}>
          <Link to="/groups">
            <IconGroups size={18} />
            <span>Client Groups</span>
          </Link>
        </li>
        <li className={isActive("/loans")}>
          <Link to="/loans">
            <IconLoans size={18} />
            <span>Loans</span>
          </Link>
        </li>
        <li className={isActive("/repayments")}>
          <Link to="/repayments">
            <IconRepayments size={18} />
            <span>Repayments</span>
          </Link>
        </li>
        <li className={isActive("/reports")}>
          <Link to="/reports">
            <IconReports size={18} />
            <span>Reports</span>
          </Link>
        </li>
        
        {user && user.role === "admin" && (
          <>
            <li className={isActive("/audit-logs")}>
              <Link to="/audit-logs">
                <IconAudit size={18} />
                <span>Audit Logs</span>
              </Link>
            </li>
            <li className={isActive("/users")}>
              <Link to="/users">
                <IconUsers size={18} />
                <span>Users</span>
              </Link>
            </li>
          </>
        )}
      </ul>

      <div className="sidebar-footer">
        <div className="nav-item">
          <button type="button" className="change-pwd-btn" onClick={onChangePassword}>
            <IconLock size={18} />
            <span>Change Password</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;