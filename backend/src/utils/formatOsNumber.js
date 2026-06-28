function formatOsNumber(year, sequence) {
  const normalizedYear = String(year);
  const normalizedSequence = String(sequence).padStart(6, "0");

  return `OS-${normalizedYear}-${normalizedSequence}`;
}

module.exports = {
  formatOsNumber,
};
