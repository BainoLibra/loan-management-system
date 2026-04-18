import React from "react";
import { Link } from "react-router-dom";

const ClientTable = ({ clients, onEdit, onDelete, user }) => {
  const statusColors = {
    active: "#27ae60",
    inactive: "#e74c3c"
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Phone</th>
            <th>Guarantor</th>
            <th>Guarantor Phone</th>
            <th>Guarantor ID</th>
            <th>Email</th>
            <th>Address</th>
            <th>Identifier</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td><Link to={`/clients/${c.id}`}>{c.firstName}</Link></td>
              <td>{c.lastName}</td>
              <td>{c.phone || "N/A"}</td>
              <td>{c.guarantorName || "N/A"}</td>
              <td>{c.guarantorPhone || "N/A"}</td>
              <td>{c.guarantorId || "N/A"}</td>
              <td>{c.email || "N/A"}</td>
              <td>{c.address || "N/A"}</td>
              <td>{c.identifier || "N/A"}</td>
              <td><span className="badge" style={{ background: statusColors[c.status] || "#999" }}>{c.status}</span></td>
              <td>
                <button className="btn-sm" onClick={() => onEdit(c)}>Edit</button>{" "}
                {user && user.role === "admin" && (
                  <button className="btn-sm btn-danger" onClick={() => onDelete(c.id)}>Delete</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientTable;