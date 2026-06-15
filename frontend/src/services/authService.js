import API_BASE, { apiFetch, clearAuthSession, getActiveToken, handleApiResponse } from "./api";

const API_URL = `${API_BASE}/api/auth`;

export const loginUser = async (email, password) => {
  try {
    const response = await apiFetch(`${API_URL}/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await handleApiResponse(response);
    if (data.token && data.user && data.user.id) {
      // Save session under sessions map so multiple users can stay logged in on same device
      try {
        const sessionsRaw = localStorage.getItem('sessions');
        const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : {};
        sessions[String(data.user.id)] = { token: data.token, user: data.user };
        localStorage.setItem('sessions', JSON.stringify(sessions));
        // set active session to this user
        localStorage.setItem('activeSessionId', String(data.user.id));
      } catch (e) {
        // fallback to single-session storage
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem('sessions', JSON.stringify({ [String(data.user.id)]: { token: data.token, user: data.user } }));
        localStorage.setItem('activeSessionId', String(data.user.id));
      }
    }
    return data;
  } catch (error) {
    throw new Error(error.message || 'Failed to connect to server');
  }
};

export const registerUser = async (name, email, password, role) => {
  try {
    const response = await apiFetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password, role }),
    });

    return await handleApiResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to register');
  }
};

export const getUser = () => {
  try {
    const activeId = localStorage.getItem('activeSessionId');
    const sessionsRaw = localStorage.getItem('sessions');
    const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : {};
    if (activeId && sessions[activeId]) return sessions[activeId].user;
  } catch (e) {
    // fallback to legacy
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const getToken = () => {
  return getActiveToken();
};

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const token = getToken();
    const response = await apiFetch(`${API_URL}/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    return await handleApiResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to change password');
  }
};

export const forgotPassword = async (email) => {
  try {
    const response = await apiFetch(`${API_URL}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    
    return await handleApiResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to connect to server');
  }
};

export const resetPassword = async (token, newPassword) => {
  try {
    const response = await apiFetch(`${API_URL}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    
    return await handleApiResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to connect to server');
  }
};

export const verifyEmail = async (token) => {
  try {
    const response = await apiFetch(`${API_URL}/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    return await handleApiResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to verify email');
  }
};

export const logout = () => {
  clearAuthSession();
};

export const switchActiveUser = (userId) => {
  const sessionsRaw = localStorage.getItem('sessions');
  const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : {};
  if (sessions[String(userId)]) {
    localStorage.setItem('activeSessionId', String(userId));
  } else {
    throw new Error('Session not found for that user');
  }
};

export const listSessions = () => {
  try {
    const sessionsRaw = localStorage.getItem('sessions');
    return sessionsRaw ? JSON.parse(sessionsRaw) : {};
  } catch (e) {
    return {};
  }
};
