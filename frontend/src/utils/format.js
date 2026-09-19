export const formatShillings = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return 'Shs 0';
  }
  return `Shs ${Number(amount).toLocaleString('en-US')}`;
};

export default formatShillings;
