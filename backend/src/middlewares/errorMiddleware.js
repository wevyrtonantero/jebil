function errorMiddleware(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Erro interno do servidor.",
    details: error.details || null,
  });
}

module.exports = {
  errorMiddleware,
};
