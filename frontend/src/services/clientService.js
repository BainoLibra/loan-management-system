import API_BASE, { getAuthHeaders } from "./api";

const API_URL = `${API_BASE}/api/clients`;

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Request failed');
  }
  return response.json();
};

export const getClients = async () => {
  const response = await fetch(API_URL, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return handleResponse(response);
};

export const getClientById = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return handleResponse(response);
};

export const createClient = async (client) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(client),
  });
  return handleResponse(response);
};

export const updateClient = async (id, client) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(client),
  });
  return handleResponse(response);
};

export const deleteClient = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return handleResponse(response);
};