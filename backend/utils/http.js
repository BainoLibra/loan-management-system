const INTERNAL_ERROR = 'Internal server error';

const normalizeEmail = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const optionalTrimmedString = (value, maxLength) => {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (maxLength && trimmed.length > maxLength) return null;
  return trimmed;
};

const sendServerError = (res, error, context = 'Request failed') => {
  console.error(`${context}:`, error);
  const status = Number(error?.status || error?.statusCode);
  if (error?.expose && status >= 400 && status < 500) {
    return res.status(status).json({ error: error.message || 'Request failed' });
  }

  const message = process.env.NODE_ENV === 'production'
    ? INTERNAL_ERROR
    : (error?.message || INTERNAL_ERROR);
  return res.status(500).json({ error: message });
};

module.exports = {
  INTERNAL_ERROR,
  isValidEmail,
  normalizeEmail,
  optionalTrimmedString,
  parseFiniteNumber,
  parsePositiveInt,
  sendServerError,
};
