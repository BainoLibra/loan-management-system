import API_BASE, { getAuthHeaders } from "./api";

const API_URL = `${API_BASE}/api/groups`;

export const getGroups = async () => {
  const response = await fetch(API_URL, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return response.json();
};

export const getGroupById = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return response.json();
};

export const createGroup = async (group) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(group),
  });
  return response.json();
};

export const updateGroup = async (id, group) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(group),
  });
  return response.json();
};

export const deleteGroup = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return response.json();
};

export const updateGroupMembers = async (id, clientIds) => {
  const response = await fetch(`${API_URL}/${id}/members`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({ clientIds }),
  });
  return response.json();
};
