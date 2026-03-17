import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "../styles/layout.css";

function Layout({ children }) {
  return (
    <div>
      <Sidebar />
      <Navbar />

      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

export default Layout;