const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const { frontendUrl, nodeEnv, uploadDir } = require("./config/env");
const apiRoutes = require("./routes");
const { requestLoggerMiddleware } = require("./middlewares/requestLoggerMiddleware");
const { notFoundMiddleware } = require("./middlewares/notFoundMiddleware");
const { errorMiddleware } = require("./middlewares/errorMiddleware");

const app = express();

if (nodeEnv === "production") {
  app.set("trust proxy", 1);
}

function buildAllowedOrigins(origin) {
  if (!origin) {
    return [];
  }

  const normalized = String(origin).trim().replace(/\/+$/, "");
  const allowed = new Set([normalized]);

  try {
    const parsedUrl = new URL(normalized);
    const { protocol, hostname, port } = parsedUrl;

    if (hostname.startsWith("www.")) {
      allowed.add(`${protocol}//${hostname.slice(4)}${port ? `:${port}` : ""}`);
    } else {
      allowed.add(`${protocol}//www.${hostname}${port ? `:${port}` : ""}`);
    }
  } catch {
    return [normalized];
  }

  return Array.from(allowed);
}

const allowedOrigins = buildAllowedOrigins(frontendUrl);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(requestLoggerMiddleware);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origem nao permitida pelo CORS."));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/uploads", express.static(path.resolve(process.cwd(), uploadDir)));

app.use("/api", apiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
