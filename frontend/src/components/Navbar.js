import React from "react";
import { useNavigate } from "react-router-dom";
import { logout, getUser } from "../services/authService";
import "../styles/navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="navbar">
      <h3>Loan Management System</h3>
      <div className="navbar-right">
        {user && <span className="navbar-user">{user.name}</span>}
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Navbar;