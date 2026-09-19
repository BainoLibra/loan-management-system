import React from "react";
import { useNavigate } from "react-router-dom";
import { logout, getUser } from "../services/authService";
import { IconMenu, IconLogout } from "./Icons";
import "../styles/navbar.css";

function Navbar({ toggleSidebar }) {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    logout();
    navigate("/");
  };

  const initial = user && user.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="navbar">
      <button className="hamburger" onClick={toggleSidebar} aria-label="Toggle menu">
        <IconMenu size={20} />
      </button>
      
      <h3>Loan Management System</h3>
      
      <div className="navbar-right">
        {user && (
          <div className="user-profile-badge">
            <div className="user-avatar">{initial}</div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role-pill">{user.role ? user.role.replace('_', ' ') : 'Member'}</span>
            </div>
          </div>
        )}
        
        <button className="logout-btn" onClick={handleLogout}>
          <IconLogout size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Navbar;