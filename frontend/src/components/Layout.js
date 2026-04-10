import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import ChangePasswordModal from "./ChangePasswordModal";
import "../styles/layout.css";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const openPasswordModal = () => {
    setPasswordModalOpen(true);
    setSidebarOpen(false); // close sidebar on mobile
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
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
      <Sidebar isOpen={sidebarOpen} onChangePassword={openPasswordModal} />
      <Navbar toggleSidebar={toggleSidebar} />

      <div className="main-content" onClick={closeSidebar}>
        {children}
      </div>

      <ChangePasswordModal isOpen={passwordModalOpen} onClose={closePasswordModal} />
    </div>
  );
}

export default Layout;