import API_BASE, { getAuthHeaders } from "./api";

const API_URL = `${API_BASE}/api/loans`;

export const getLoans = async () => {
  const response = await fetch(API_URL, { 
    headers: getAuthHeaders(),
    credentials: "include"
  });
  return response.json();
};

export const createLoan = async (formData) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: formData,
  });
  return response.json();
};

export const approveLoan = async (id) => {
  const response = await fetch(`${API_URL}/${id}/approve`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
  });
  return response.json();
};

export const rejectLoan = async (id) => {
  const response = await fetch(`${API_URL}/${id}/reject`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
  });
  return response.json();
};

export const disburseLoan = async (id) => {
  const response = await fetch(`${API_URL}/${id}/disburse`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
  });
  return response.json();
};

export const getLoanSchedule = async (id) => {
  const response = await fetch(`${API_URL}/${id}/schedule`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  return response.json();
};

export const getRepayments = async (loanId) => {
  const response = await fetch(`${API_URL}/${loanId}`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  return response.json();
};

export const repayLoan = async (loanId, amount, scheduleId) => {
  const response = await fetch(`${API_URL}/${loanId}/repay`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({ amount, scheduleId }),
  });
  return response.json();
};
