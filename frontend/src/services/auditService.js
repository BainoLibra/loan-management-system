import API_BASE, { getAuthHeaders, handleApiResponse } from "./api";

const API_URL = `${API_BASE}/api/audit-logs`;

export const getAuditLogs = async () => {
  const response = await fetch(API_URL, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return handleApiResponse(response);
};
