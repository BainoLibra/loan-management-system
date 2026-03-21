import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getAuditLogs } from "../services/auditService";
import "../styles/table.css";

function AuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const data = await getAuditLogs();
      if (Array.isArray(data)) setLogs(data);
    };
    fetchLogs();
  }, []);

  return (
    <Layout>
      <h2>Audit Logs</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>User</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Entity ID</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.id}</td>
              <td>{log.userName}</td>
              <td>{log.action}</td>
              <td>{log.entity}</td>
              <td>{log.entityId}</td>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}

export default AuditLogs;