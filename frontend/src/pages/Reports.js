import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getAgingReport } from "../services/reportService";
import "../styles/table.css";

function Reports() {
  const [report, setReport] = useState([]);

  useEffect(() => {
    const fetchReport = async () => {
      const data = await getAgingReport();
      if (Array.isArray(data)) setReport(data.filter(Boolean));
    };
    fetchReport();
  }, []);

  return (
    <Layout>
      <h2>Aging Report</h2>
      <table>
        <thead>
          <tr>
            <th>Loan ID</th>
            <th>Client</th>
            <th>Amount</th>
            <th>Balance</th>
            <th>Due Date</th>
            <th>Days Overdue</th>
            <th>Bucket</th>
            <th>In Arrears</th>
          </tr>
        </thead>
        <tbody>
          {report.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.clientName}</td>
              <td>{Number(r.amount).toLocaleString()}</td>
              <td>{Number(r.balance).toLocaleString()}</td>
              <td>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "-"}</td>
              <td>{r.daysOverdue}</td>
              <td>{r.bucket}</td>
              <td>{r.inArrears ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}

export default Reports;