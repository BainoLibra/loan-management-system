import API_BASE, { apiFetch, getAuthHeaders, handleApiResponse } from "./api";

const API_URL = `${API_BASE}/api/clients`;

export const getClients = async () => {
  const response = await apiFetch(API_URL, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return handleApiResponse(response);
};

export const getClientById = async (id) => {
  const response = await apiFetch(`${API_URL}/${id}`, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return handleApiResponse(response);
};

export const createClient = async (client) => {
  const response = await apiFetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(client),
  });
  return handleApiResponse(response);
};

export const updateClient = async (id, client) => {
  const response = await apiFetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(client),
  });
  return handleApiResponse(response);
};

export const deleteClient = async (id) => {
  const response = await apiFetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return handleApiResponse(response);
};
