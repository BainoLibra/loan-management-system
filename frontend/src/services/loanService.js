import API_BASE, { getAuthHeaders, handleApiResponse } from "./api";

const API_URL = `${API_BASE}/api/loans`;

export const getLoans = async () => {
  try {
    const response = await fetch(API_URL, { 
      headers: getAuthHeaders(),
      credentials: "include"
    });
    return await handleApiResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch loans');
  }
};

export const createLoan = async (loan) => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(loan),
    });
    return await handleApiResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to create loan');
  }
};

export const approveLoan = async (id) => {
  try {
    const response = await fetch(`${API_URL}/${id}/approve`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    return await handleApiResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to approve loan');
  }
};

export const rejectLoan = async (id) => {
  try {
    const response = await fetch(`${API_URL}/${id}/reject`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    return await handleApiResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to reject loan');
  }
};

export const disburseLoan = async (id) => {
  try {
    const response = await fetch(`${API_URL}/${id}/disburse`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    return await handleApiResponse(response);
  } catch (error) {
    throw new Error(error.message || 'Failed to disburse loan');
  }
};

export const getLoanSchedule = async (id) => {
  const response = await fetch(`${API_URL}/${id}/schedule`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  return handleApiResponse(response);
};

export const getRepayments = async (loanId) => {
  const response = await fetch(`${API_URL}/${loanId}`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  return handleApiResponse(response);
};

export const repayLoan = async (loanId, amount, scheduleId) => {
  const response = await fetch(`${API_URL}/${loanId}/repay`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({ amount, scheduleId }),
  });
  return handleApiResponse(response);
};
