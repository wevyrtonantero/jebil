const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { uploadDir } = require("./env");
const { ApiError } = require("../utils/ApiError");

const mecanicosDir = path.resolve(process.cwd(), uploadDir, "mecanicos");
const fotosEntradaDir = path.resolve(process.cwd(), uploadDir, "fotos-entrada");
const orcamentosPdfDir = path.resolve(process.cwd(), uploadDir, "orcamentos-pdf");
const assinaturasPdfDir = path.resolve(process.cwd(), uploadDir, "assinaturas-pdf");

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
fs.mkdirSync(mecanicosDir, { recursive: true });
fs.mkdirSync(fotosEntradaDir, { recursive: true });
fs.mkdirSync(orcamentosPdfDir, { recursive: true });
fs.mkdirSync(assinaturasPdfDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, mecanicosDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeName = `mecanico-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, safeName);
  },
});

const uploadMecanicoFoto = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new ApiError(400, "Arquivo de foto invalido. Envie JPG, PNG ou WEBP."));
      return;
    }

    cb(null, true);
  },
});

const fotosEntradaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, fotosEntradaDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeName = `foto-entrada-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, safeName);
  },
});

const uploadFotosEntrada = multer({
  storage: fotosEntradaStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new ApiError(400, "Arquivo de foto invalido. Envie JPG, PNG ou WEBP."));
      return;
    }

    cb(null, true);
  },
});

const orcamentoPdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, orcamentosPdfDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".pdf";
    const safeName = `orcamento-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, safeName);
  },
});

const uploadOrcamentoPdf = multer({
  storage: orcamentoPdfStorage,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new ApiError(400, "Arquivo invalido. Envie um PDF."));
      return;
    }

    cb(null, true);
  },
});

module.exports = {
  mecanicosDir,
  fotosEntradaDir,
  orcamentosPdfDir,
  assinaturasPdfDir,
  uploadMecanicoFoto,
  uploadFotosEntrada,
  uploadOrcamentoPdf,
};
