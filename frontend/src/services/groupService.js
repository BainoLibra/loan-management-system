import API_BASE, { apiFetch, getAuthHeaders, handleApiResponse } from "./api";

const API_URL = `${API_BASE}/api/groups`;

export const getGroups = async () => {
  const response = await apiFetch(API_URL, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return handleApiResponse(response);
};

export const getGroupById = async (id) => {
  const response = await apiFetch(`${API_URL}/${id}`, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return handleApiResponse(response);
};

export const createGroup = async (group) => {
  const response = await apiFetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(group),
  });
  return handleApiResponse(response);
};

export const updateGroup = async (id, group) => {
  const response = await apiFetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(group),
  });
  return handleApiResponse(response);
};

export const deleteGroup = async (id) => {
  const response = await apiFetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return handleApiResponse(response);
};

export const updateGroupMembers = async (id, clientIds) => {
  const response = await apiFetch(`${API_URL}/${id}/members`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({ clientIds }),
  });
  return handleApiResponse(response);
};
