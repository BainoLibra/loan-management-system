import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "../styles/layout.css";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 769) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div>
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}
      <Sidebar isOpen={sidebarOpen} />
      <Navbar toggleSidebar={toggleSidebar} />

      <div className="main-content" onClick={closeSidebar}>
        {children}
      </div>
    </div>
  );
}

export default Layout;