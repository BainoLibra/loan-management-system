import API_BASE, { getAuthHeaders } from "./api";

const API_URL = `${API_BASE}/api/clients`;

export const getClients = async () => {
  const response = await fetch(API_URL, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return response.json();
};

export const getClientById = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return response.json();
};

export const createClient = async (client) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(client),
  });
  return response.json();
};

export const updateClient = async (id, client) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(client),
  });
  return response.json();
};

export const deleteClient = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return response.json();
};