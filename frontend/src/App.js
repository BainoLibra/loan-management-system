import React from "react";
import {BrowserRouter as Router, Routes, Route} from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Loans from "./pages/Loans";
import Repayments from "./pages/Repayments";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/repayments" element={<Repayments />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
      </Routes>
    </Router>
  );
}

export default App;
