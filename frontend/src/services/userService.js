import API_BASE, { getAuthHeaders, handleApiResponse } from "./api";

const API_URL = `${API_BASE}/api/users`;

export const getUsers = async () => {
  const response = await fetch(API_URL, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return handleApiResponse(response);
};

export const createUser = async (user) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(user),
  });
  return handleApiResponse(response);
};

export const updateUser = async (id, user) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(user),
  });
  return handleApiResponse(response);
};

export const resetUserPassword = async (id, password) => {
  const response = await fetch(`${API_URL}/${id}/reset-password`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({ password }),
  });
  return handleApiResponse(response);
};

export const deleteUser = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return handleApiResponse(response);
};
