import API_BASE from "./api";

const API_URL = `${API_BASE}/api/auth`;

export const loginUser = async (email, password) => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Login failed');
    }
    
    const data = await response.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    return data;
  } catch (error) {
    throw new Error(error.message || 'Failed to connect to server');
  }
};

export const registerUser = async (name, email, password, role) => {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password, role }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Registration failed');
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(error.message || 'Failed to register');
  }
};

export const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const getToken = () => localStorage.getItem("token");

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Password change failed');
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(error.message || 'Failed to change password');
  }
};

export const forgotPassword = async (email) => {
  try {
    const response = await fetch(`${API_URL}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  } catch (error) {
    throw new Error(error.message || 'Failed to connect to server');
  }
};

export const resetPassword = async (token, newPassword) => {
  try {
    const response = await fetch(`${API_URL}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Reset failed');
    return data;
  } catch (error) {
    throw new Error(error.message || 'Failed to connect to server');
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};