const API_BASE = process.env.NODE_ENV === "production"
  ? ""
  : (process.env.REACT_APP_API_URL || "http://localhost:4000");

export const getAuthHeaders = ({ json = true } = {}) => {
  const activeId = localStorage.getItem("activeSessionId");
  let token = null;
  try {
    const sessionsRaw = localStorage.getItem("sessions");
    const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : {};
    if (activeId && sessions[activeId]) token = sessions[activeId].token;
  } catch (e) {
    token = null;
  }

  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Remove only the active session from storage (used when token expires)
export const clearAuthSession = () => {
  try {
    const activeId = localStorage.getItem("activeSessionId");
    if (!activeId) return;
    const sessionsRaw = localStorage.getItem("sessions");
    const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : {};
    delete sessions[activeId];
    localStorage.setItem("sessions", JSON.stringify(sessions));
    // pick another session as active if available
    const remainingIds = Object.keys(sessions);
    if (remainingIds.length > 0) {
      localStorage.setItem("activeSessionId", remainingIds[0]);
    } else {
      localStorage.removeItem("activeSessionId");
    }
  } catch (e) {
    localStorage.removeItem("sessions");
    localStorage.removeItem("activeSessionId");
  }
};

export const isTokenExpired = (token = localStorage.getItem("token")) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
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
