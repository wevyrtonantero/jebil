const multer = require("multer");
const { ApiError } = require("../utils/ApiError");

function uploadErrorMiddleware(error, _req, _res, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      next(new ApiError(400, "Arquivo muito grande. O limite atual desta operacao foi excedido."));
      return;
    }
  }

  next(error);
}

module.exports = {
  uploadErrorMiddleware,
};
