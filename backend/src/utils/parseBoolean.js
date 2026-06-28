function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "sim", "ativo"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "nao", "não", "inativo"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

module.exports = {
  parseBoolean,
};
