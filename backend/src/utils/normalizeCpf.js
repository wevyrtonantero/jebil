function normalizeCpf(cpf) {
  if (!cpf) {
    return null;
  }

  const normalized = String(cpf).replace(/\D/g, "");

  if (normalized.length !== 11) {
    return null;
  }

  return normalized;
}

module.exports = {
  normalizeCpf,
};
