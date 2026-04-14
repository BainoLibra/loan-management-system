import API_BASE, { getAuthHeaders } from "./api";

const API_URL = `${API_BASE}/api/reports`;

export const getAgingReport = async () => {
  const response = await fetch(`${API_URL}/aging`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  return response.json();
};
