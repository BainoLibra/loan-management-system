const API_URL = "http://localhost:3000/api/clients";

export const getClients = async () => {
  const response = await fetch(API_URL);
  return response.json();
};