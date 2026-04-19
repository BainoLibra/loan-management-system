import API_BASE, { getAuthHeaders } from "./api";

const API_URL = `${API_BASE}/api/audit-logs`;

export const getAuditLogs = async () => {
  const handleResponse = async (response) => {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to fetch audit logs');
    }
    return response.json();
  };

  const response = await fetch(API_URL, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return handleResponse(response);
};
