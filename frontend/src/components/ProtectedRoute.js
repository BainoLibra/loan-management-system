import React from "react";
import { Navigate } from "react-router-dom";
import { getToken, getUser, logout } from "../services/authService";
import { isTokenExpired } from "../services/api";

function ProtectedRoute({ children, allowedRoles }) {
  const token = getToken();
  const user = getUser();

  if (!token) return <Navigate to="/" replace />;
  if (isTokenExpired(token)) {
    logout();
    return <Navigate to="/" replace />;
  }
  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
