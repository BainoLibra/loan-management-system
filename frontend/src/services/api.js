const API_BASE = process.env.NODE_ENV === "production"
  ? ""
  : (process.env.REACT_APP_API_URL || "http://localhost:4000");

export const getActiveToken = () => {
  try {
    const activeId = localStorage.getItem("activeSessionId");
    const sessionsRaw = localStorage.getItem("sessions");
    const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : {};
    if (activeId && sessions[activeId]) return sessions[activeId].token;
  } catch (e) {
    return localStorage.getItem("token");
  }

  return localStorage.getItem("token");
};

export const getAuthHeaders = ({ json = true } = {}) => {
  const token = getActiveToken();

  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Remove only the active session from storage (used when token expires)
export const clearAuthSession = () => {
  try {
    const activeId = localStorage.getItem("activeSessionId");
    const sessionsRaw = localStorage.getItem("sessions");
    const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : {};
    if (activeId) delete sessions[activeId];
    localStorage.setItem("sessions", JSON.stringify(sessions));
    // pick another session as active if available
    const remainingIds = Object.keys(sessions);
    if (remainingIds.length > 0) {
      localStorage.setItem("activeSessionId", remainingIds[0]);
    } else {
      localStorage.removeItem("activeSessionId");
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch (e) {
    localStorage.removeItem("sessions");
    localStorage.removeItem("activeSessionId");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
};

export const isTokenExpired = (token = getActiveToken()) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

export const apiFetch = async (url, options = {}, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please check your connection and try again.");
    }
    throw new Error(error.message || "Unable to connect to server.");
  } finally {
    clearTimeout(timeoutId);
  }
};

export const handleApiResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const authMessage = payload?.error || payload?.message || "";
    if (response.status === 401 || (response.status === 403 && /token/i.test(authMessage))) {
      clearAuthSession();
    }

    const message = authMessage
      || (typeof payload === "string" && payload.trim())
      || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload || {};
};

export default API_BASE;
