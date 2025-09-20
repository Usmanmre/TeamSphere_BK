const normalizeEmail = (email) => {
  return email.toLowerCase().split('@')[0];
};

export { normalizeEmail };