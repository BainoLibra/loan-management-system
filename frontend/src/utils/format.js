export const formatShillings = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return 'UGX 0';
  }
  return `UGX ${Number(amount).toLocaleString('en-US')}`;
};

export default formatShillings;
