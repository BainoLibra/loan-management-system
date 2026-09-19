import React from "react";
import { Link } from "react-router-dom";

const ClientTable = ({ clients, onEdit, onDelete, user }) => {
  return (
    <div className="table-card">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Guarantor</th>
              <th>Email</th>
              <th>Identifier</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                  No clients found.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id}>
                  <td>#{c.id}</td>
                  <td>
                    <Link to={`/clients/${c.id}`} style={{ color: "var(--primary)", fontWeight: "600", textDecoration: "none" }}>
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td>{c.phone || "—"}</td>
                  <td>
                    {c.guarantorName ? (
                      <div>
                        <span style={{ fontWeight: 500 }}>{c.guarantorName}</span>
                        {c.guarantorPhone && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.guarantorPhone}</div>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{c.email || "—"}</td>
                  <td>{c.identifier || "—"}</td>
                  <td>
                    <span className={`badge badge-${c.status || "active"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button className="btn-sm btn-secondary" onClick={() => onEdit(c)}>
                        Edit
                      </button>
                      {user && user.role === "admin" && (
                        <button className="btn-sm btn-danger" onClick={() => onDelete(c.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientTable;