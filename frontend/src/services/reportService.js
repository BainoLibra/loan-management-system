import API_BASE, { apiFetch, getAuthHeaders, handleApiResponse } from "./api";

const API_URL = `${API_BASE}/api/reports`;

export const getAgingReport = async () => {
  const response = await apiFetch(`${API_URL}/aging`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  return handleApiResponse(response);
};

export const getDashboardSummary = async () => {
  const response = await apiFetch(`${API_URL}/summary`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  return handleApiResponse(response);
};
