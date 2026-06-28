function sendSuccess(res, data, message = "Operacao realizada com sucesso.", statusCode = 200, meta) {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  sendSuccess,
};
