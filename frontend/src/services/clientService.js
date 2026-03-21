import API_BASE, { getAuthHeaders } from "./api";

const API_URL = `${API_BASE}/api/clients`;

export const getClients = async () => {
  const response = await fetch(API_URL, { headers: getAuthHeaders() });
  return response.json();
};

export const createClient = async (client) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(client),
  });
  return response.json();
};