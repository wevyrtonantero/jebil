function validatePlate(plate) {
  if (!plate) {
    return true;
  }

  const normalized = String(plate).toUpperCase().replace(/[^A-Z0-9]/g, "");

  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalized) || /^[A-Z]{3}[0-9]{4}$/.test(normalized);
}

module.exports = {
  validatePlate,
};
