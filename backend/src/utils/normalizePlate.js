function normalizePlate(plate) {
  if (!plate) {
    return null;
  }

  const normalized = String(plate).toUpperCase().replace(/[^A-Z0-9]/g, "");

  return normalized || null;
}

module.exports = {
  normalizePlate,
};
