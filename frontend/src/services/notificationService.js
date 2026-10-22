import API_BASE, { apiFetch, getAuthHeaders, handleApiResponse } from "./api";

const API_URL = `${API_BASE}/api/notifications`;

export const getNotifications = async () => {
  const response = await apiFetch(API_URL, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  return handleApiResponse(response);
};

export const retryNotification = async (id) => {
  const response = await apiFetch(`${API_URL}/${id}/retry`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
  });
  return handleApiResponse(response);
};