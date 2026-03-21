import API_BASE, { getAuthHeaders } from "./api";

const API_URL = `${API_BASE}/api/users`;

export const getUsers = async () => {
  const response = await fetch(API_URL, { headers: getAuthHeaders() });
  return response.json();
};

export const createUser = async (user) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(user),
  });
  return response.json();
};

export const updateUser = async (id, user) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(user),
  });
  return response.json();
};

export const resetUserPassword = async (id, password) => {
  const response = await fetch(`${API_URL}/${id}/reset-password`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ password }),
  });
  return response.json();
};

export const deleteUser = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return response.json();
};
