import React, { useState, useEffect } from "react";
import { getClients } from "../services/clientService";

const LoanForm = ({ onSubmit, initialData = {}, submitting = false }) => {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    clientId: initialData.clientId || "",
    amount: initialData.amount || "",
    interestRate: "1.5",
    termMonths: "6",
    guarantorName: initialData.guarantorName || "",
    notes: initialData.notes || "",
    documents: null,
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setError("");
      const data = await getClients();
      if (Array.isArray(data)) setClients(data);
    } catch (err) {
      setError(err.message || "Failed to load clients");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleFileChange = (e) => {
    setForm({ ...form, documents: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const getClientLabel = (client) => {
    const fullName = [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
    return fullName || client.name || `Client #${client.id}`;
  };

  return (
    <form onSubmit={handleSubmit} className="loan-form">
      <h3>{initialData.id ? "Edit Loan" : "New Loan Application"}</h3>
      {error && <div className="form-error">{error}</div>}
      <div className="form-group">
        <label>Client:</label>
        <select name="clientId" value={form.clientId} onChange={handleChange} required disabled={submitting}>
          <option value="">Select Client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{getClientLabel(c)}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Loan Amount:</label>
        <input
          type="number"
          name="amount"
          value={form.amount}
          onChange={handleChange}
          min="300000"
          max="2000000"
          required
          disabled={submitting}
        />
      </div>
      <div className="form-group">
        <label>Interest Rate (%):</label>
        <input
          type="number"
          name="interestRate"
          value={form.interestRate}
          readOnly
          step="0.01"
          disabled={submitting}
        />
      </div>
      <div className="form-group">
        <label>Term (Months):</label>
        <input
          type="number"
          name="termMonths"
          value={form.termMonths}
          readOnly
          disabled={submitting}
        />
      </div>
      <div className="form-group">
        <label>Guarantor Name:</label>
        <input
          type="text"
          name="guarantorName"
          value={form.guarantorName}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>
      <div className="form-group">
        <label>Notes:</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows="4"
          disabled={submitting}
        />
      </div>
      <div className="form-group">
        <label>Attach Documents:</label>
        <input
          type="file"
          name="documents"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.jpg,.png"
          disabled={submitting}
        />
      </div>
      <button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : (initialData.id ? "Update Loan" : "Submit Application")}
      </button>
    </form>
  );
};

export default LoanForm;
