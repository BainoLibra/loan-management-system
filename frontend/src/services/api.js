const API_BASE = process.env.NODE_ENV === "production"
  ? ""
  : (process.env.REACT_APP_API_URL || "http://localhost:4000");

export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default API_BASE;
